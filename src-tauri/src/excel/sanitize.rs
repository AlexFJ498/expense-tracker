use crate::error::{AppError, AppResult};
use regex::Regex;
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
