package com.artacademy.auth.repository;

import com.artacademy.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    List<User> findAllByBootstrapTrue();

    /**
     * Count PRINCIPAL users that are NOT the seeded bootstrap dummy admin. Used to decide whether the
     * bootstrap admin should still be allowed to log in (only while zero real principals exist).
     */
    @Query("select count(u) from User u join u.roles r where r.name = 'PRINCIPAL' and u.bootstrap = false")
    long countRealPrincipals();
}
