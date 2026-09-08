package com.artacademy.scheduling.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "SCHEDULE_VERSIONS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleVersion {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "VERSION_NUMBER", nullable = false)
    private Integer versionNumber;

    @Column(name = "PUBLISHED_AT", nullable = false)
    private Instant publishedAt;

    @Column(name = "PUBLISHED_BY", length = 200)
    private String publishedBy;

    @Column(name = "ENTRY_COUNT", nullable = false)
    private Integer entryCount;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ScheduleVersionEntry> entries = new ArrayList<>();
}
