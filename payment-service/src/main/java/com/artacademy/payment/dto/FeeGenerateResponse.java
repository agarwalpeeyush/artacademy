package com.artacademy.payment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/** Result of a Generate-Bill action: what was created, what was already billed, and gaps. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeeGenerateResponse {

    /** Bills created by this call. */
    @Builder.Default
    private List<FeeBillResponse> generated = new ArrayList<>();

    /** Fee types that already had a bill and were skipped (e.g. "ADMISSION"). */
    @Builder.Default
    private List<String> alreadyBilled = new ArrayList<>();

    /** Missing recurring months (enroll month → today) not yet billed, as "yyyy-MM". */
    @Builder.Default
    private List<String> missingMonths = new ArrayList<>();

    public void addMissingMonth(YearMonth ym) {
        missingMonths.add(ym.toString());
    }
}
