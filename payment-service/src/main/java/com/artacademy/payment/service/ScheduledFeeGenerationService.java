package com.artacademy.payment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduledFeeGenerationService {

    private final FeeService feeService;

    /**
     * Runs at midnight on the 1st of every month.
     * Generates fee cycles for all active students for the current month/year.
     */
    @Scheduled(cron = "0 0 1 * * *")
    public void generateFeesForCurrentMonth() {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();

        log.info("Scheduled fee generation triggered for {}/{}", month, year);

        try {
            var generated = feeService.generateMonthlyFees(month, year);
            log.info("Scheduled fee generation completed: {} cycles created/found for {}/{}",
                    generated.size(), month, year);
        } catch (Exception e) {
            log.error("Scheduled fee generation failed for {}/{}: {}", month, year, e.getMessage(), e);
        }
    }
}
