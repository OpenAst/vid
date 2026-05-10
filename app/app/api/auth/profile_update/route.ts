import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const accessToken = req.cookies.get("access")?.value;

  if (!accessToken) {
    return new Response(JSON.stringify({
      error: 'Unauthorized'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json'}
    });
  }

  try {
    const {
      avatar,
      first_name,
      last_name,
      bio,
      skill_tags,
      website_url,
      twitter_url,
      linkedin_url,
      featured_video_id,
      open_to_collab,
      open_to_hire,
      open_to_mentor,
      availability_status,
      is_private,
      onboarding_completed,
      skipped_profile_setup,
      skipped_interests,
      skipped_follow_suggestions,
    } = await req.json();

    const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/profile/update/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `JWT ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(
        { 
          avatar,
          first_name,
          last_name,
          bio,
          skill_tags,
          website_url,
          twitter_url,
          linkedin_url,
          featured_video_id,
          open_to_collab,
          open_to_hire,
          open_to_mentor,
          availability_status,
          is_private,
          onboarding_completed,
          skipped_profile_setup,
          skipped_interests,
          skipped_follow_suggestions,
        }),
    });

    const text = await apiRes.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text };
    }
    console.log("The updated profile", data);
    
    if (!apiRes.ok) {
      console.error("Django error:", data);
      return NextResponse.json(data, { status: apiRes.status });
    }

    return NextResponse.json(data, { status: 200 });
  
    } catch (err) {
      console.error("Update user error:", err);
      return new Response(
        JSON.stringify({ error: "Something went wrong while updating profile" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
  }
}
