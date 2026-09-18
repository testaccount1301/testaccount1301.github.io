import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get('path');
  if (!filePath) return NextResponse.json({ error: 'Path is required' }, { status: 400 });

  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return NextResponse.json({ error: 'Server config missing' }, { status: 500 });

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3.raw' },
    });
    if (!response.ok) return NextResponse.json({ error: 'File not found' }, { status: response.status });
    const blob = await response.blob();
    return new NextResponse(blob, {
      headers: { 'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`, 'Content-Type': 'application/octet-stream' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
