import app from './app'
import { env } from './config/env'

const port = env.port || 5000

app.listen(port, '0.0.0.0', () => {
  console.log(`Ticket Booking System API listening on 0.0.0.0:${port}`)
})

