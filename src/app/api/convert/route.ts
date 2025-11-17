import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Save the uploaded file
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = join(uploadsDir, filename)
    
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // For now, we'll simulate the conversion process
    // In a real application, you would use a library like pdf-poppler or pdf2pic
    // to convert PDF to JPG images
    
    // Simulate conversion delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create a mock JPG filename (in reality, this would be the converted image)
    const jpgFilename = filename.replace('.pdf', '.jpg')
    const jpgUrl = `/api/files/${jpgFilename}`

    // Save conversion record to database
    const conversion = await db.conversion.create({
      data: {
        originalName: file.name,
        imageUrl: jpgUrl,
        userId: decoded.userId
      }
    })

    return NextResponse.json({
      message: 'File converted successfully',
      file: {
        id: conversion.id,
        originalName: conversion.originalName,
        imageUrl: conversion.imageUrl,
        createdAt: conversion.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}