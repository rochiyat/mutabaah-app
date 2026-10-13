import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', error)

  if (error.status) {
    res.status(error.status).json({
      message: error.message,
      errors: error.errors
    })
    return
  }

  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
}
