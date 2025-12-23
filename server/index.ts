import express, { Express } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import activityRoutes from './routes/activities'
import recordRoutes from './routes/records'
import statsRoutes from './routes/stats'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app: Express = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/records', recordRoutes)
app.use('/api/stats', statsRoutes)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
})
