import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = Object.keys(process.env)
    .filter(key => key.includes('SHOPIFY') || key.includes('TOKEN') || key.includes('KEY') || key.includes('DOMAIN'))
    .reduce((acc, key) => {
      acc[key] = process.env[key];
      return acc;
    }, {} as Record<string, string | undefined>);
    
  return NextResponse.json(envVars);
}
