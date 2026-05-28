use crate::error::{AppError, AppResult};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::io::{Cursor, Read, Seek, Write};
use std::path::Path;

/// Returns true if the xlsx contains extensions that umya-spreadsheet cannot parse.
pub fn needs_sanitize(path: &Path) -> AppResult<bool> {
    let f = File::open(path)?;
    let mut zip = zip::ZipArchive::new(f).map_err(|e| AppError::Excel(e.to_string()))?;

    // Slicers and slicer caches are known-problematic.
    for i in 0..zip.len() {
        let name = zip
            .by_index(i)
            .map_err(|e| AppError::Excel(e.to_string()))?
            .name()
            .to_string();
        if name.starts_with("xl/slicers/") || name.starts_with("xl/slicerCaches/") {
            return Ok(true);
        }
    }

    // Internal hyperlinks (Target="#…") inside drawing rels break umya's raw-file loader.
    for i in 0..zip.len() {
        let mut f = zip
            .by_index(i)
            .map_err(|e| AppError::Excel(e.to_string()))?;
        let name = f.name().to_string();
        if name.starts_with("xl/drawings/_rels/") && name.ends_with(".rels") {
            let mut s = String::new();
            f.read_to_string(&mut s).map_err(AppError::Io)?;
            if s.contains("Target=\"#") {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

/// Rewrite xlsx in-place without slicers and without internal hyperlinks in drawing rels.
/// Safe to run even if nothing needs sanitization.
pub fn sanitize_in_place(path: &Path) -> AppResult<()> {
    let buf = std::fs::read(path)?;
    let cleaned = sanitize_bytes(&buf)?;
    // Atomic replace
    let tmp = path.with_extension("xlsx.sanitize.tmp");
    std::fs::write(&tmp, cleaned)?;
    std::fs::rename(&tmp, path)?;
    Ok(())
}

fn sanitize_bytes(input: &[u8]) -> AppResult<Vec<u8>> {
    let cursor = Cursor::new(input);
    let mut zip = zip::ZipArchive::new(cursor).map_err(|e| AppError::Excel(e.to_string()))?;

    let out_buf = Vec::new();
    let mut cursor_out = Cursor::new(out_buf);
    {
        let mut writer = zip::ZipWriter::new(&mut cursor_out);
        let options: zip::write::SimpleFileOptions = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        let re_rel_slicer = Regex::new(r##"<Relationship\s+[^>]*slicer[^>]*/>"##).unwrap();
        let re_rel_slicer_cache = Regex::new(r#"<Relationship\s+[^>]*slicerCache[^>]*/>"#).unwrap();
        let re_override_slicer = Regex::new(r#"<Override\s+[^>]*slicer[^>]*/>"#).unwrap();
        let re_internal_hyperlink =
            Regex::new(r##"<Relationship\s+[^>]*Target="#[^"]*"[^/]*/>"##).unwrap();
        let drawing_hyperlink_ids = collect_internal_drawing_hyperlink_ids(
            &mut zip,
            &re_internal_hyperlink,
        )?;
        let re_x14_slicer_caches =
            Regex::new(r#"(?s)<x14:slicerCaches[^>]*>.*?</x14:slicerCaches>"#).unwrap();
        let re_x15_slicer_caches =
            Regex::new(r#"(?s)<x15:slicerCaches[^>]*>.*?</x15:slicerCaches>"#).unwrap();
        let re_empty_ext = Regex::new(r#"<ext\s+[^>]*xmlns:x1[45][^>]*>\s*</ext>"#).unwrap();
        let re_x14_slicer_list =
            Regex::new(r#"(?s)<ext[^>]*>\s*<x14:slicerList[^>]*>.*?</x14:slicerList>\s*</ext>"#)
                .unwrap();
        let re_x15_slicer_list =
            Regex::new(r#"(?s)<ext[^>]*>\s*<x15:slicerList[^>]*>.*?</x15:slicerList>\s*</ext>"#)
                .unwrap();
        let re_empty_extlst = Regex::new(r#"<extLst>\s*</extLst>"#).unwrap();

        let count = zip.len();
        for i in 0..count {
            let mut f = zip
                .by_index(i)
                .map_err(|e| AppError::Excel(e.to_string()))?;
            let name = f.name().to_string();

            // Drop slicer payloads entirely
            if name.starts_with("xl/slicers/") || name.starts_with("xl/slicerCaches/") {
                continue;
            }

            let mut data = Vec::new();
            f.read_to_end(&mut data)?;

            let new_data: Vec<u8> = if name == "[Content_Types].xml" {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_override_slicer.replace_all(&s, "").to_string();
                s.into_bytes()
            } else if name == "xl/_rels/workbook.xml.rels" {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_rel_slicer_cache.replace_all(&s, "").to_string();
                s.into_bytes()
            } else if name.starts_with("xl/worksheets/_rels/") && name.ends_with(".rels") {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_rel_slicer.replace_all(&s, "").to_string();
                s.into_bytes()
            } else if name.starts_with("xl/drawings/_rels/") && name.ends_with(".rels") {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_internal_hyperlink.replace_all(&s, "").to_string();
                s.into_bytes()
            } else if let Some(ids) = drawing_hyperlink_ids.get(&name) {
                let s = String::from_utf8_lossy(&data).to_string();
                remove_drawing_hyperlink_nodes(&s, ids).into_bytes()
            } else if name == "xl/workbook.xml" {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_x14_slicer_caches.replace_all(&s, "").to_string();
                let s = re_x15_slicer_caches.replace_all(&s, "").to_string();
                let s = re_empty_ext.replace_all(&s, "").to_string();
                s.into_bytes()
            } else if name.starts_with("xl/worksheets/") && name.ends_with(".xml") {
                let s = String::from_utf8_lossy(&data).to_string();
                let s = re_x14_slicer_list.replace_all(&s, "").to_string();
                let s = re_x15_slicer_list.replace_all(&s, "").to_string();
                let s = re_empty_extlst.replace_all(&s, "").to_string();
                s.into_bytes()
            } else {
                data
            };

            writer
                .start_file(&name, options)
                .map_err(|e| AppError::Excel(e.to_string()))?;
            writer
                .write_all(&new_data)
                .map_err(|e| AppError::Io(std::io::Error::other(e)))?;
        }

        writer
            .finish()
            .map_err(|e| AppError::Excel(e.to_string()))?;
    }

    let _ = cursor_out.seek(std::io::SeekFrom::Start(0));
    Ok(cursor_out.into_inner())
}

fn collect_internal_drawing_hyperlink_ids<R: Read + Seek>(
    zip: &mut zip::ZipArchive<R>,
    re_internal_hyperlink: &Regex,
) -> AppResult<HashMap<String, HashSet<String>>> {
    let re_id = Regex::new(r#"Id="([^"]+)""#).unwrap();
    let mut by_drawing = HashMap::new();

    for i in 0..zip.len() {
        let mut f = zip
            .by_index(i)
            .map_err(|e| AppError::Excel(e.to_string()))?;
        let name = f.name().to_string();
        let Some(drawing_path) = drawing_path_for_relationships(&name) else {
            continue;
        };

        let mut s = String::new();
        f.read_to_string(&mut s).map_err(AppError::Io)?;
        let ids: HashSet<String> = re_internal_hyperlink
            .find_iter(&s)
            .filter_map(|m| {
                re_id
                    .captures(m.as_str())
                    .and_then(|captures| captures.get(1))
                    .map(|id| id.as_str().to_string())
            })
            .collect();

        if !ids.is_empty() {
            by_drawing.insert(drawing_path, ids);
        }
    }

    Ok(by_drawing)
}

fn drawing_path_for_relationships(name: &str) -> Option<String> {
    let drawing_name = name
        .strip_prefix("xl/drawings/_rels/")?
        .strip_suffix(".rels")?;
    Some(format!("xl/drawings/{drawing_name}"))
}

fn remove_drawing_hyperlink_nodes(input: &str, ids: &HashSet<String>) -> String {
    let id_patterns: Vec<Regex> = ids
        .iter()
        .map(|id| Regex::new(&format!(r#"\br:id\s*=\s*"{}""#, regex::escape(id))).unwrap())
        .collect();
    let re_hlink =
        Regex::new(r#"(?s)<a:hlink(?:Click|Hover)\b[^>]*(?:/>|>.*?</a:hlink(?:Click|Hover)>)"#)
            .unwrap();

    re_hlink
        .replace_all(input, |captures: &regex::Captures| {
            let node = captures.get(0).unwrap().as_str();
            if id_patterns.iter().any(|pattern| pattern.is_match(node)) {
                String::new()
            } else {
                node.to_string()
            }
        })
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use zip::write::SimpleFileOptions;

    #[test]
    fn removes_drawing_hyperlinks_when_internal_relationships_are_removed() {
        let input = xlsx_with_internal_drawing_hyperlink();

        let output = sanitize_bytes(&input).expect("sanitize xlsx");
        let mut zip = zip::ZipArchive::new(Cursor::new(output)).expect("open sanitized zip");

        let mut drawing_rels = String::new();
        zip.by_name("xl/drawings/_rels/drawing1.xml.rels")
            .expect("drawing rels")
            .read_to_string(&mut drawing_rels)
            .expect("read drawing rels");
        assert!(!drawing_rels.contains("Target=\"#"));
        assert!(drawing_rels.contains("rId2"));

        let mut drawing = String::new();
        zip.by_name("xl/drawings/drawing1.xml")
            .expect("drawing")
            .read_to_string(&mut drawing)
            .expect("read drawing");
        assert!(!drawing.contains("a:hlinkClick"));
        assert!(!drawing.contains("rId1"));
        assert!(drawing.contains("r:embed=\"rId2\""));
    }

    fn xlsx_with_internal_drawing_hyperlink() -> Vec<u8> {
        let mut out = Cursor::new(Vec::new());
        {
            let mut writer = zip::ZipWriter::new(&mut out);
            let options =
                SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

            writer
                .start_file("xl/drawings/_rels/drawing1.xml.rels", options)
                .unwrap();
            writer
                .write_all(
                    br##"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="#REGISTRO!A1"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>"##,
                )
                .unwrap();

            writer.start_file("xl/drawings/drawing1.xml", options).unwrap();
            writer
                .write_all(
                    br##"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:pic>
      <xdr:nvPicPr>
        <xdr:cNvPr id="2" name="Button 1">
          <a:hlinkClick r:id="rId1"/>
        </xdr:cNvPr>
        <xdr:cNvPicPr/>
      </xdr:nvPicPr>
      <xdr:blipFill>
        <a:blip r:embed="rId2"/>
      </xdr:blipFill>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>"##,
                )
                .unwrap();

            writer.finish().unwrap();
        }
        out.into_inner()
    }
}
