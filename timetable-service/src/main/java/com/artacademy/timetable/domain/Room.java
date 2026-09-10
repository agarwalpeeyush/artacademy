package com.artacademy.timetable.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.util.UUID;

@Entity
@Table(name = "ROOMS")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(name = "ROOM_NAME", nullable = false, length = 100)
    private String roomName;

    @Column(name = "CAPACITY", nullable = false)
    private Integer capacity;
}
