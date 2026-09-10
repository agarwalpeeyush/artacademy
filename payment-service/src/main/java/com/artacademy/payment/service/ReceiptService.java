package com.artacademy.payment.service;

import com.artacademy.payment.domain.Payment;
import com.artacademy.payment.domain.PaymentAllocation;
import com.artacademy.payment.domain.StudentFeeCycle;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
public class ReceiptService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private static final Font TITLE_FONT = new Font(Font.HELVETICA, 20, Font.BOLD, new Color(63, 81, 181));
    private static final Font HEADING_FONT = new Font(Font.HELVETICA, 13, Font.BOLD);
    private static final Font LABEL_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, Color.DARK_GRAY);
    private static final Font VALUE_FONT = new Font(Font.HELVETICA, 10, Font.NORMAL);
    private static final Font TABLE_HEAD_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, Color.WHITE);

    /** Builds a downloadable PDF receipt for a single payment. */
    public byte[] generateReceipt(Payment payment) {
        StudentFeeCycle cycle = payment.getFeeCycle();
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        Document document = new Document(PageSize.A4, 48, 48, 48, 48);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Header
            Paragraph title = new Paragraph("Art Academy", TITLE_FONT);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);

            Paragraph subtitle = new Paragraph("Payment Receipt", HEADING_FONT);
            subtitle.setAlignment(Element.ALIGN_CENTER);
            subtitle.setSpacingAfter(16);
            document.add(subtitle);

            document.add(divider());

            // Receipt meta
            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.setSpacingBefore(12);
            meta.setSpacingAfter(12);
            addKeyValue(meta, "Receipt No.", "RCP-" + shortId(payment.getId().toString()));
            addKeyValue(meta, "Payment Date",
                    payment.getPaymentDate() != null ? payment.getPaymentDate().format(DATE_FMT) : "-");
            addKeyValue(meta, "Student ID", payment.getStudentId().toString());
            addKeyValue(meta, "Billing Period",
                    cycle != null ? monthYear(cycle.getBillingMonth(), cycle.getBillingYear()) : "-");
            addKeyValue(meta, "Payment Mode", nvl(payment.getPaymentMode()));
            addKeyValue(meta, "Transaction Ref", nvl(payment.getTransactionReference()));
            document.add(meta);

            // Allocation breakdown
            Paragraph breakdownHeading = new Paragraph("Allocation Breakdown", HEADING_FONT);
            breakdownHeading.setSpacingBefore(8);
            breakdownHeading.setSpacingAfter(6);
            document.add(breakdownHeading);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3f, 1f});
            addTableHeader(table, "Course ID");
            addTableHeader(table, "Allocated Amount");

            if (payment.getAllocations() != null) {
                for (PaymentAllocation alloc : payment.getAllocations()) {
                    String courseId = alloc.getFeeDetail() != null && alloc.getFeeDetail().getCourseId() != null
                            ? alloc.getFeeDetail().getCourseId().toString()
                            : "-";
                    addTableCell(table, courseId, Element.ALIGN_LEFT);
                    addTableCell(table, money(alloc.getAllocatedAmount()), Element.ALIGN_RIGHT);
                }
            }
            document.add(table);

            // Amount paid
            Paragraph amountPaid = new Paragraph("Amount Paid: " + money(payment.getAmount()),
                    new Font(Font.HELVETICA, 12, Font.BOLD, new Color(46, 125, 50)));
            amountPaid.setSpacingBefore(12);
            amountPaid.setAlignment(Element.ALIGN_RIGHT);
            document.add(amountPaid);

            // Cycle summary
            if (cycle != null) {
                document.add(divider());
                Paragraph cycleHeading = new Paragraph("Fee Cycle Summary", HEADING_FONT);
                cycleHeading.setSpacingBefore(12);
                cycleHeading.setSpacingAfter(6);
                document.add(cycleHeading);

                PdfPTable summary = new PdfPTable(2);
                summary.setWidthPercentage(100);
                addKeyValue(summary, "Total Amount", money(cycle.getTotalAmount()));
                addKeyValue(summary, "Total Paid", money(cycle.getPaidAmount()));
                addKeyValue(summary, "Outstanding", money(cycle.getOutstandingAmount()));

                BigDecimal total = nz(cycle.getTotalAmount());
                BigDecimal paid = nz(cycle.getPaidAmount());
                BigDecimal diff = paid.subtract(total);
                if (diff.signum() > 0) {
                    addKeyValue(summary, "Excess (Advance)", money(diff));
                } else if (diff.signum() < 0) {
                    addKeyValue(summary, "Short (Due)", money(diff.negate()));
                }
                addKeyValue(summary, "Status", nvl(cycle.getStatus() != null ? cycle.getStatus().name() : null));
                document.add(summary);
            }

            Paragraph footer = new Paragraph(
                    "This is a computer-generated receipt and does not require a signature.",
                    new Font(Font.HELVETICA, 8, Font.ITALIC, Color.GRAY));
            footer.setSpacingBefore(24);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            log.error("Failed to generate receipt PDF for paymentId={}", payment.getId(), e);
            throw new IllegalStateException("Failed to generate receipt PDF", e);
        }

        return out.toByteArray();
    }

    private static Paragraph divider() {
        Paragraph p = new Paragraph(new Chunk(new com.lowagie.text.pdf.draw.LineSeparator(
                0.5f, 100, Color.LIGHT_GRAY, Element.ALIGN_CENTER, -2)));
        p.setSpacingBefore(4);
        p.setSpacingAfter(4);
        return p;
    }

    private static void addKeyValue(PdfPTable table, String label, String value) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, LABEL_FONT));
        labelCell.setBorder(Rectangle.NO_BORDER);
        labelCell.setPadding(4);
        PdfPCell valueCell = new PdfPCell(new Phrase(value, VALUE_FONT));
        valueCell.setBorder(Rectangle.NO_BORDER);
        valueCell.setPadding(4);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private static void addTableHeader(PdfPTable table, String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, TABLE_HEAD_FONT));
        cell.setBackgroundColor(new Color(63, 81, 181));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private static void addTableCell(PdfPTable table, String text, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, VALUE_FONT));
        cell.setPadding(6);
        cell.setHorizontalAlignment(align);
        table.addCell(cell);
    }

    private static String shortId(String id) {
        return id.replace("-", "").substring(0, 8).toUpperCase();
    }

    private static String monthYear(Integer month, Integer year) {
        if (month == null || year == null) return "-";
        String[] names = {"", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        String m = (month >= 1 && month <= 12) ? names[month] : String.valueOf(month);
        return m + " " + year;
    }

    private static String money(BigDecimal amount) {
        return "INR " + nz(amount).toPlainString();
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static String nvl(String v) {
        return v != null && !v.isBlank() ? v : "-";
    }
}
