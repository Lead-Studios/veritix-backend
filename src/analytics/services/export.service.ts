import { Injectable } from "@nestjs/common"
import type { Response } from "express"
import * as PDFKit from "pdfkit"
import type { DashboardResponseDto } from "../dto/dashboard-response.dto"
import type { SessionAnalyticsDashboardDto } from "../dto/session-analytics.dto"

@Injectable()
export class ExportService {
  async exportToCsv(data: DashboardResponseDto, res: Response): Promise<void> {
    const csvContent = this.generateCsvContent(data)

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=conference-analytics.csv")
    res.send(csvContent)
  }

  async exportToPdf(data: DashboardResponseDto, res: Response): Promise<void> {
    const doc = new PDFKit()

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=conference-analytics.pdf")

    doc.pipe(res)

    this.generatePdfContent(doc, data)

    doc.end()
  }

  private generateCsvContent(data: DashboardResponseDto): string {
    let csv = ""

    // Summary
    csv += "SUMMARY\n"
    csv += "Metric,Value\n"
    csv += `Total Conferences,${data.summary.totalConferences}\n`
    csv += `Total Sessions,${data.summary.totalSessions}\n`
    csv += `Total Attendees,${data.summary.totalAttendees}\n`
    csv += `Average Feedback Score,${data.summary.averageFeedbackScore.toFixed(2)}\n`
    csv += `Overall Punctuality Rate,${data.summary.overallPunctualityRate.toFixed(2)}%\n\n`

    // Attendance per day
    csv += "ATTENDANCE PER DAY\n"
    csv += "Date,Total Attendees,Total Sessions,Average Attendance Per Session\n"
    data.attendancePerDay.forEach((item) => {
      csv += `${item.date},${item.totalAttendees},${item.totalSessions},${item.averageAttendancePerSession.toFixed(2)}\n`
    })
    csv += "\n"

    // Most attended sessions
    csv += "MOST ATTENDED SESSIONS\n"
    csv += "Session Title,Speaker,Track,Attendee Count,Capacity,Attendance Rate,Scheduled Start Time\n"
    data.mostAttendedSessions.forEach((session) => {
      csv += `"${session.sessionTitle}","${session.speakerName}","${session.track}",${session.attendeeCount},${session.capacity},${session.attendanceRate.toFixed(2)}%,"${session.scheduledStartTime}"\n`
    })
    csv += "\n"

    // Speaker punctuality
    csv += "SPEAKER PUNCTUALITY\n"
    csv += "Speaker Name,Total Sessions,On Time Sessions,Late Sessions,Average Delay Minutes,Punctuality Rate\n"
    data.speakerPunctuality.forEach((speaker) => {
      csv += `"${speaker.speakerName}",${speaker.totalSessions},${speaker.onTimeSessions},${speaker.lateSessions},${speaker.averageDelayMinutes.toFixed(2)},${speaker.punctualityRate.toFixed(2)}%\n`
    })
    csv += "\n"

    // Feedback stats
    csv += "FEEDBACK STATISTICS\n"
    csv += "Session Title,Speaker,Average Rating,Total Feedbacks,1 Star,2 Star,3 Star,4 Star,5 Star\n"
    data.feedbackStats.forEach((feedback) => {
      csv += `"${feedback.sessionTitle}","${feedback.speakerName}",${feedback.averageRating.toFixed(2)},${feedback.totalFeedbacks},${feedback.ratingDistribution.rating1},${feedback.ratingDistribution.rating2},${feedback.ratingDistribution.rating3},${feedback.ratingDistribution.rating4},${feedback.ratingDistribution.rating5}\n`
    })

    return csv
  }

  private generatePdfContent(doc: PDFKit.PDFDocument, data: DashboardResponseDto): void {
    // Title
    doc.fontSize(20).text("Conference Analytics Report", { align: "center" })
    doc.moveDown()

    // Summary
    doc.fontSize(16).text("Summary", { underline: true })
    doc.fontSize(12)
    doc.text(`Total Conferences: ${data.summary.totalConferences}`)
    doc.text(`Total Sessions: ${data.summary.totalSessions}`)
    doc.text(`Total Attendees: ${data.summary.totalAttendees}`)
    doc.text(`Average Feedback Score: ${data.summary.averageFeedbackScore.toFixed(2)}`)
    doc.text(`Overall Punctuality Rate: ${data.summary.overallPunctualityRate.toFixed(2)}%`)
    doc.moveDown()

    // Most Attended Sessions
    doc.fontSize(16).text("Top 5 Most Attended Sessions", { underline: true })
    doc.fontSize(10)
    data.mostAttendedSessions.slice(0, 5).forEach((session, index) => {
      doc.text(`${index + 1}. ${session.sessionTitle} by ${session.speakerName}`)
      doc.text(`   Attendees: ${session.attendeeCount}/${session.capacity} (${session.attendanceRate.toFixed(1)}%)`)
      doc.moveDown(0.5)
    })

    // Speaker Punctuality
    doc.addPage()
    doc.fontSize(16).text("Speaker Punctuality", { underline: true })
    doc.fontSize(10)
    data.speakerPunctuality.slice(0, 10).forEach((speaker, index) => {
      doc.text(`${index + 1}. ${speaker.speakerName}`)
      doc.text(
        `   Punctuality Rate: ${speaker.punctualityRate.toFixed(1)}% (${speaker.onTimeSessions}/${speaker.totalSessions} sessions on time)`,
      )
      if (speaker.averageDelayMinutes > 0) {
        doc.text(`   Average Delay: ${speaker.averageDelayMinutes.toFixed(1)} minutes`)
      }
      doc.moveDown(0.5)
    })

    // Feedback Statistics
    if (data.feedbackStats.length > 0) {
      doc.addPage()
      doc.fontSize(16).text("Top Rated Sessions", { underline: true })
      doc.fontSize(10)
      data.feedbackStats.slice(0, 10).forEach((feedback, index) => {
        doc.text(`${index + 1}. ${feedback.sessionTitle} by ${feedback.speakerName}`)
        doc.text(`   Average Rating: ${feedback.averageRating.toFixed(2)}/5 (${feedback.totalFeedbacks} reviews)`)
        doc.moveDown(0.5)
      })
    }
  }

  async exportSessionAnalyticsToCsv(data: SessionAnalyticsDashboardDto, res: Response): Promise<void> {
    const csvContent = this.generateSessionAnalyticsCsvContent(data)

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=session-analytics.csv")
    res.send(csvContent)
  }

  async exportSessionAnalyticsToPdf(data: SessionAnalyticsDashboardDto, res: Response): Promise<void> {
    const doc = new PDFKit()

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", "attachment; filename=session-analytics.pdf")

    doc.pipe(res)

    this.generateSessionAnalyticsPdfContent(doc, data)

    doc.end()
  }

  private generateSessionAnalyticsCsvContent(data: SessionAnalyticsDashboardDto): string {
    let csv = ""

    // Summary
    csv += "SESSION ANALYTICS SUMMARY\n"
    csv += "Metric,Value\n"
    csv += `Conference,${data.conferenceName}\n`
    csv += `Total Sessions,${data.totalSessions}\n`
    csv += `Total Attendance,${data.totalAttendance}\n`
    csv += `Average Attendance,${data.averageAttendance.toFixed(2)}\n`
    csv += `Average Rating,${data.averageRating.toFixed(2)}\n`
    csv += `Overall Punctuality Score,${data.overallPunctualityScore.toFixed(2)}%\n`
    csv += `Period,${data.period.start} to ${data.period.end}\n\n`

    // Daily attendance
    csv += "DAILY ATTENDANCE\n"
    csv += "Date,Total Sessions,Total Attendance,Average Attendance Per Session\n"
    data.dailyAttendance.forEach((item) => {
      csv += `${item.date},${item.totalSessions},${item.totalAttendance},${item.averageAttendancePerSession.toFixed(2)}\n`
    })
    csv += "\n"

    // Top sessions
    csv += "TOP ATTENDED SESSIONS\n"
    csv += "Session Title,Speaker,Track,Attendance Count,Capacity,Attendance Percentage,Average Rating,Feedback Count,Punctuality Score,Duration (min)\n"
    data.topSessions.forEach((session) => {
      csv += `"${session.sessionTitle}","${session.speakerName}","${session.track}",${session.attendanceCount},${session.capacity},${session.attendancePercentage.toFixed(2)}%,${session.averageRating.toFixed(2)},${session.feedbackCount},${session.punctualityScore.toFixed(2)}%,${session.duration.toFixed(0)}\n`
    })
    csv += "\n"

    // Speaker analytics
    csv += "SPEAKER ANALYTICS\n"
    csv += "Speaker Name,Total Sessions,Total Attendance,Average Attendance,Average Rating,Punctuality Score,Total Feedback\n"
    data.speakerAnalytics.forEach((speaker) => {
      csv += `"${speaker.speakerName}",${speaker.totalSessions},${speaker.totalAttendance},${speaker.averageAttendance.toFixed(2)},${speaker.averageRating.toFixed(2)},${speaker.punctualityScore.toFixed(2)}%,${speaker.totalFeedback}\n`
    })
    csv += "\n"

    // Track analytics
    csv += "TRACK ANALYTICS\n"
    csv += "Track,Total Sessions,Total Attendance,Average Attendance,Average Rating,Punctuality Score\n"
    data.trackAnalytics.forEach((track) => {
      csv += `"${track.track}",${track.totalSessions},${track.totalAttendance},${track.averageAttendance.toFixed(2)},${track.averageRating.toFixed(2)},${track.punctualityScore.toFixed(2)}%\n`
    })
    csv += "\n"

    // Session overlaps
    csv += "SESSION OVERLAPS\n"
    csv += "Time Slot,Overlapping Sessions,Total Attendance,Average Attendance Per Session,Sessions\n"
    data.sessionOverlaps.forEach((overlap) => {
      csv += `"${overlap.timeSlot}",${overlap.overlappingSessions},${overlap.totalAttendance},${overlap.averageAttendancePerSession.toFixed(2)},"${overlap.sessions.join('; ')}"\n`
    })

    return csv
  }

  private generateSessionAnalyticsPdfContent(doc: PDFKit.PDFDocument, data: SessionAnalyticsDashboardDto): void {
    // Title
    doc.fontSize(20).text("Session Analytics Report", { align: "center" })
    doc.moveDown()

    // Conference info
    doc.fontSize(14).text(`Conference: ${data.conferenceName}`, { underline: true })
    doc.fontSize(12)
    doc.text(`Period: ${new Date(data.period.start).toLocaleDateString()} - ${new Date(data.period.end).toLocaleDateString()}`)
    doc.moveDown()

    // Summary
    doc.fontSize(16).text("Summary", { underline: true })
    doc.fontSize(12)
    doc.text(`Total Sessions: ${data.totalSessions}`)
    doc.text(`Total Attendance: ${data.totalAttendance}`)
    doc.text(`Average Attendance: ${data.averageAttendance.toFixed(2)}`)
    doc.text(`Average Rating: ${data.averageRating.toFixed(2)}`)
    doc.text(`Overall Punctuality Score: ${data.overallPunctualityScore.toFixed(2)}%`)
    doc.moveDown()

    // Top Sessions
    doc.fontSize(16).text("Top 5 Most Attended Sessions", { underline: true })
    doc.fontSize(10)
    data.topSessions.slice(0, 5).forEach((session, index) => {
      doc.text(`${index + 1}. ${session.sessionTitle} by ${session.speakerName}`)
      doc.text(`   Track: ${session.track}`)
      doc.text(`   Attendance: ${session.attendanceCount}/${session.capacity} (${session.attendancePercentage.toFixed(1)}%)`)
      doc.text(`   Rating: ${session.averageRating.toFixed(2)}/5 (${session.feedbackCount} reviews)`)
      doc.text(`   Punctuality: ${session.punctualityScore.toFixed(1)}%`)
      doc.moveDown(0.5)
    })

    // Speaker Analytics
    doc.addPage()
    doc.fontSize(16).text("Speaker Performance", { underline: true })
    doc.fontSize(10)
    data.speakerAnalytics.slice(0, 10).forEach((speaker, index) => {
      doc.text(`${index + 1}. ${speaker.speakerName}`)
      doc.text(`   Sessions: ${speaker.totalSessions}`)
      doc.text(`   Total Attendance: ${speaker.totalAttendance}`)
      doc.text(`   Average Attendance: ${speaker.averageAttendance.toFixed(1)}`)
      doc.text(`   Average Rating: ${speaker.averageRating.toFixed(2)}/5`)
      doc.text(`   Punctuality: ${speaker.punctualityScore.toFixed(1)}%`)
      doc.moveDown(0.5)
    })

    // Track Analytics
    if (data.trackAnalytics.length > 0) {
      doc.addPage()
      doc.fontSize(16).text("Track Performance", { underline: true })
      doc.fontSize(10)
      data.trackAnalytics.forEach((track, index) => {
        doc.text(`${index + 1}. ${track.track}`)
        doc.text(`   Sessions: ${track.totalSessions}`)
        doc.text(`   Total Attendance: ${track.totalAttendance}`)
        doc.text(`   Average Attendance: ${track.averageAttendance.toFixed(1)}`)
        doc.text(`   Average Rating: ${track.averageRating.toFixed(2)}/5`)
        doc.text(`   Punctuality: ${track.punctualityScore.toFixed(1)}%`)
        doc.moveDown(0.5)
      })
    }

    // Session Overlaps
    if (data.sessionOverlaps.length > 0) {
      doc.addPage()
      doc.fontSize(16).text("Session Overlaps", { underline: true })
      doc.fontSize(10)
      data.sessionOverlaps.slice(0, 10).forEach((overlap, index) => {
        doc.text(`${index + 1}. ${overlap.timeSlot}`)
        doc.text(`   Overlapping Sessions: ${overlap.overlappingSessions}`)
        doc.text(`   Total Attendance: ${overlap.totalAttendance}`)
        doc.text(`   Average per Session: ${overlap.averageAttendancePerSession.toFixed(1)}`)
        doc.moveDown(0.5)
      })
    }
  }
}
