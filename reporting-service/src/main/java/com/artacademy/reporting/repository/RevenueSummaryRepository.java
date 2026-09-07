package com.artacademy.reporting.repository;

import com.artacademy.reporting.domain.RevenueSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RevenueSummaryRepository extends JpaRepository<RevenueSummary, UUID> {

    Optional<RevenueSummary> findByBillingMonthAndBillingYear(Integer billingMonth, Integer billingYear);

    List<RevenueSummary> findAllByOrderByBillingYearDescBillingMonthDesc();
}
