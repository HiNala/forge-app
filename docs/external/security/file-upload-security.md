# File Upload Security — Reference for Forge

**Version:** N/A
**Last researched:** 2026-04-19

## Forge Upload Flow

1. Client requests a presigned upload URL from `POST /p/{slug}/upload`
2. Client uploads directly to S3/MinIO using the presigned URL
3. Client includes the file URL in the form submission payload
4. Backend validates the file metadata before storing the submission

## Security Layers

### 1. Client-Side (First Defense)
```javascript
// In generated page JS
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error('File too large (max 10MB)');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('File type not allowed');
}

// Compress images before upload
async function compressImage(file, maxDimension = 2048) {
  // Use canvas to resize
}
```

### 2. Server-Side (Presigned URL Generation)
```python
async def generate_upload_url(file_name: str, content_type: str, org_id: str):
    # Validate content type
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "File type not allowed")

    # Generate UUID filename (prevents path traversal)
    ext = mimetypes.guess_extension(content_type) or ".bin"
    safe_key = f"uploads/{org_id}/{uuid.uuid4()}{ext}"

    # Presigned URL with constraints
    url = s3_client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET,
            "Key": safe_key,
            "ContentType": content_type,
            "ContentLength": 10 * 1024 * 1024,  # Max 10MB
        },
        ExpiresIn=300,  # 5 minutes
    )
    return {"upload_url": url, "file_key": safe_key}
```

### 3. Serving Files
```python
# Never serve files directly — always presigned download URLs
async def get_file_url(file_key: str) -> str:
    url = s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": file_key},
        ExpiresIn=3600,  # 1 hour
    )
    return url
```

## Security Checklist

- [x] Validate MIME type at multiple layers (client, server)
- [x] Enforce max file size (10MB post-compression)
- [x] Rename files to UUIDs (prevent path traversal)
- [x] Serve via presigned URLs only (no direct file serving)
- [x] Separate upload bucket from application data
- [x] Presigned URLs expire (5min upload, 1hr download)
- [ ] Virus scan (post-MVP — integrate ClamAV or similar)

## Known Pitfalls

1. **MIME sniffing**: Don't trust `Content-Type` header alone. Verify magic bytes for images.
2. **Path traversal**: Never use user-supplied filenames in storage keys. Always UUID.
3. **Direct serving**: Never serve uploaded files through your application server.

## Links
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
