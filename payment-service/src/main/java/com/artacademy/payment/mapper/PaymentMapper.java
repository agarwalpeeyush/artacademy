package com.artacademy.payment.mapper;

import com.artacademy.payment.domain.Payment;
import com.artacademy.payment.domain.PaymentAllocation;
import com.artacademy.payment.domain.StudentFeeDetail;
import com.artacademy.payment.domain.StudentFeeCycle;
import com.artacademy.payment.dto.*;
import org.mapstruct.*;

import java.util.List;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PaymentMapper {

    @Mapping(target = "status", expression = "java(cycle.getStatus().name())")
    @Mapping(target = "cycleKind", expression = "java(cycle.getCycleKind() != null ? cycle.getCycleKind().name() : null)")
    @Mapping(target = "details", ignore = true)
    FeeCycleResponse toCycleResponse(StudentFeeCycle cycle);

    @Mapping(target = "status", expression = "java(cycle.getStatus().name())")
    @Mapping(target = "cycleKind", expression = "java(cycle.getCycleKind() != null ? cycle.getCycleKind().name() : null)")
    @Mapping(target = "details", source = "details")
    FeeCycleResponse toCycleResponseWithDetails(StudentFeeCycle cycle);

    @Mapping(target = "feeCycleId", source = "feeCycle.id")
    @Mapping(target = "status", expression = "java(detail.getStatus().name())")
    FeeDetailResponse toDetailResponse(StudentFeeDetail detail);

    List<FeeDetailResponse> toDetailResponseList(List<StudentFeeDetail> details);

    @Named("paymentSimple")
    @Mapping(target = "feeCycleId", source = "feeCycle.id")
    @Mapping(target = "allocations", ignore = true)
    PaymentResponse toPaymentResponse(Payment payment);

    @Mapping(target = "feeCycleId", source = "feeCycle.id")
    @Mapping(target = "allocations", source = "allocations")
    PaymentResponse toPaymentResponseWithAllocations(Payment payment);

    @Mapping(target = "paymentId", source = "payment.id")
    @Mapping(target = "feeDetailId", source = "feeDetail.id")
    PaymentAllocationResponse toAllocationResponse(PaymentAllocation allocation);

    List<PaymentAllocationResponse> toAllocationResponseList(List<PaymentAllocation> allocations);

    @IterableMapping(qualifiedByName = "paymentSimple")
    List<PaymentResponse> toPaymentResponseList(List<Payment> payments);
}
