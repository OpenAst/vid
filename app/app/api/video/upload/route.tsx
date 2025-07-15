import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData(); 
    const csrfToken = req.cookies.get('csrftoken')?.value;
    const accessToken = req.cookies.get("access")?.value;

    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const thumbnail = formData.get("thumbnail") as File | null;


    if (!csrfToken || !title || !accessToken || !file || !description) {
      return NextResponse.json(
        { error: "Missing required fields or authentication"},
        { status: 400}
      )
    }

    const presignedRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/videos/get_presigned_url/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
          Authorization: `JWT ${accessToken}`,
        },
        credentials: "include",
        body: JSON.stringify({
          file_name: file.name,
          file_type: file.type,
          thumbnail_name: thumbnail?.name,
          thumbnail_type: thumbnail?.type,
        }),
      }
    );

    if (!presignedRes.ok) {
      const error = await presignedRes.json();
      throw new Error(`Presigned URL error: ${error.message || error}`);
    }

    const { video: videoPresigned, thumbnail: thumbnailPresigned } = await presignedRes.json();

    const uploadVideoFormData = new FormData();
    Object.entries(videoPresigned.fields).forEach(([key, value]) => {
      uploadVideoFormData.append(key, value as string);
    });
    uploadVideoFormData.append("file", file);

    const uploadVideoRes = await fetch(videoPresigned.url, {
      method: "POST",
      body: uploadVideoFormData,
    });

    if (!uploadVideoRes.ok) {
      throw new Error('Video upload to R2 failed');
    }

    let thumbnailKey = null;
    if (thumbnail && thumbnailPresigned) {
      const uploadThumbnailFormData = new FormData();
      Object.entries(thumbnailPresigned.fields).forEach(([key, value]) => {
        uploadThumbnailFormData.append(key, value as string);
      })
      uploadThumbnailFormData.append("file", thumbnail);

      const thumbnailUploadRes = await fetch(thumbnailPresigned.url, {
        method: "POST",
        body: uploadThumbnailFormData
      });

      if (!thumbnailUploadRes.ok) {
        throw new Error("Thumbnail upload to R2 failed");
      }
      thumbnailKey = thumbnailPresigned.key;
    }

    // Save metadata to Django 
    const saveRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/videos/upload/`, {
      method: "POST",
      headers: {
        Authorization: `JWT ${req.cookies.get('access')?.value}`,
        'X-CSRFToken': csrfToken, 
      },
      credentials: 'include',
      body: JSON.stringify({
        title,
        description,
        file_key: videoPresigned.key,
        thumbnail_key: thumbnailKey,
      }),
    });

    if (!saveRes.ok) {
      const error = await saveRes.json();
      throw new Error(`Saving metadata failed: ${error.message || error}`);
    }

    const finalData = await saveRes.json();
    return NextResponse.json(finalData, { status: 201});
    
  } catch (err) {
    console.log('Error working upload', err);
    return NextResponse.json(
      {
        error: 'Something went wrong uploading video',
      },
      { status: 500, headers: {'Content-Type': 'application/json'}}
    );
  }
}
