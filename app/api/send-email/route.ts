
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { decrypt } from '@/lib/encryption';
import { createTransport } from '@/lib/email-service';

export async function POST(req: Request) {
  try {
    const { to, subject, html, userId, userEmail, encryptedAppPassword, attachments, sharedWith = [] } = await req.json();

    if (!to || !subject || !html || !userId || !userEmail || !encryptedAppPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Decrypt password (using passed credential, avoiding server-side Firestore read)
    const appPassword = decrypt(encryptedAppPassword);

    if (!appPassword) {
      return NextResponse.json({ error: 'Failed to decrypt App Password.' }, { status: 500 });
    }

    // 3. Create Transport
    const transporter = createTransport(userEmail, appPassword);

    // 4. Prepare attachments (download from Cloudinary as buffers)
    const mailAttachments = [];
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          const url = typeof attachment === 'string' ? attachment : attachment.url;
          const originalName = typeof attachment === 'string' ? url.split('/').pop() : attachment.name;
          // Fix Cloudinary URL: PDFs/docs need /raw/upload/ not /image/upload/
          const fixedUrl = url.replace('/image/upload/', '/raw/upload/');
          const response = await fetch(fixedUrl);
          if (!response.ok) throw new Error(`Failed to fetch ${fixedUrl}: ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          // Determine content type from filename extension
          const name = originalName || 'attachment';
          const ext = name.split('.').pop()?.toLowerCase();
          const contentTypeMap: Record<string, string> = {
            pdf: 'application/pdf',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          };
          mailAttachments.push({
            filename: name,
            content: buffer,
            contentType: contentTypeMap[ext || ''] || 'application/octet-stream',
            contentDisposition: 'attachment' as const,
          });
        } catch (err) {
          console.error('Failed to download attachment:', attachment, err);
        }
      }
    }

    // 5. Send Email
    await transporter.sendMail({
      from: userEmail,
      to,
      subject,
      html,
      attachments: mailAttachments,
    });

    const sharedWithList = Array.isArray(sharedWith)
      ? sharedWith.filter((email: unknown): email is string => typeof email === 'string' && email.trim().length > 0)
      : [];

    await addDoc(collection(db, 'users', userId, 'sent_emails'), {
      to,
      subject,
      html,
      sharedWith: sharedWithList,
      sentAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
