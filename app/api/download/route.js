import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  const password = searchParams.get('password');

  if (password !== process.env.SITE_PASSWORD) {
    return NextResponse.json({ error: 'Wrong Password' }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;

  if (!token || !repo) {
    return NextResponse.json({ error: 'Missing Server Keys (Token or Repo)' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: { 
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub Error:', errorData);
      return NextResponse.json({ 
        error: `GitHub Error: ${errorData.message}`,
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Critical Server Error' }, { status: 500 });
  }
}
