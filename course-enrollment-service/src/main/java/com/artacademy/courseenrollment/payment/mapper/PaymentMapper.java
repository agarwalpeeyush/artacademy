package com.artacademy.courseenrollment.payment.mapper;

import com.artacademy.courseenrollment.payment.domain.FeeBill;
import com.artacademy.courseenrollment.payment.domain.Payment;
import com.artacademy.courseenrollment.payment.domain.StudentFeeDetail;
import com.artacademy.courseenrollment.payment.dto.FeeBillResponse;
import com.artacademy.courseenrollment.payment.dto.FeeDetailDto;
import com.artacademy.courseenrollment.payment.dto.PaymentResponse;
import org.mapstruct.*;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PaymentMapper {

    @Mapping(target = "settledBillIds", ignore = true)
    @Mapping(target = "creditBalance", ignore = true)
    PaymentResponse toPaymentResponse(Payment payment);

    @Mapping(target = "feeType", expression = "java(detail.getFeeType() != null ? detail.getFeeType().name() : null)")
    @Mapping(target = "cadence", expression = "java(detail.getCadence() != null ? detail.getCadence().name() : null)")
    @Mapping(target = "instituteShareType",
            expression = "java(detail.getInstituteShareType() != null ? detail.getInstituteShareType().name() : null)")
    FeeDetailDto toDetailDto(StudentFeeDetail detail);

    @Mapping(target = "feeType", expression = "java(bill.getFeeType() != null ? bill.getFeeType().name() : null)")
    @Mapping(target = "cadence", expression = "java(bill.getCadence() != null ? bill.getCadence().name() : null)")
    @Mapping(target = "status", expression = "java(bill.getStatus() != null ? bill.getStatus().name() : null)")
    @Mapping(target = "overridden", ignore = true)
    @Mapping(target = "overdue", ignore = true)
    @Mapping(target = "displayStatus", ignore = true)
    @Mapping(target = "excessAmount", ignore = true)
    @Mapping(target = "shortAmount", ignore = true)
    FeeBillResponse toBillResponse(FeeBill bill);
}
