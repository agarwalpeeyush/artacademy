package com.artacademy.auth.repository;

import com.artacademy.auth.domain.ReservedUsername;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservedUsernameRepository extends JpaRepository<ReservedUsername, String> {
    boolean existsByUsername(String username);
}
