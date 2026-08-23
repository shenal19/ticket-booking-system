import cors from 'cors'
import express, { Application } from 'express'
import { env } from './config/env'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import routes from './routes'

const app: Application = express()

// Core middleware
app.use(
  cors({
    origin: env.frontendUrl
      ? [env.frontendUrl, env.frontendUrl.replace(/\/$/, '')]
      : true,
    credentials: true,
  }),
)
app.use(express.json())

// API routes
app.use('/api', routes)

// 404 + centralized error handling
app.use(notFoundHandler)
app.use(errorHandler)

export default app
