import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || ''; // Get current folder path
  const password = searchParams.get('password'); // Get password from request

  // 1. Check Password
  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect Password' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  try {
    // 2. Ask GitHub for the contents of the current path
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}` },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Folder not found' }, { status: response.status });
    }

    const data = await response.json();
    
    // GitHub returns an array of files/folders. We send that list to the frontend.
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
