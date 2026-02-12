
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    return new Promise<NextResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw', // Use 'raw' for documents (PDF, DOCX) to get correct URLs
          folder: 'codemailer_resumes', 
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            resolve(NextResponse.json({ error: 'Upload failed' }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ url: result?.secure_url, public_id: result?.public_id }));
          }
        }
      );
      uploadStream.end(buffer);
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
