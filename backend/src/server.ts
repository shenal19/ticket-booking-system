import app from './app'
import { env } from './config/env'

app.listen(env.port, () => {
  console.log(`Ticket Booking System API listening on port ${env.port}`)
})
