package com.artacademy.scheduling.service;

import com.artacademy.common.exception.ApiException;
import com.artacademy.scheduling.domain.Room;
import com.artacademy.scheduling.dto.RoomRequest;
import com.artacademy.scheduling.dto.RoomResponse;
import com.artacademy.scheduling.mapper.RoomMapper;
import com.artacademy.scheduling.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomMapper roomMapper;

    @Transactional(readOnly = true)
    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(roomMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoomResponse getById(UUID id) {
        return roomMapper.toResponse(findRoomById(id));
    }

    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        Room room = roomMapper.toEntity(request);
        return roomMapper.toResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse updateRoom(UUID id, RoomRequest request) {
        Room room = findRoomById(id);
        roomMapper.updateEntityFromRequest(request, room);
        return roomMapper.toResponse(roomRepository.save(room));
    }

    @Transactional
    public void deleteRoom(UUID id) {
        if (!roomRepository.existsById(id)) {
            throw new ApiException("Room not found with id: " + id, HttpStatus.NOT_FOUND);
        }
        roomRepository.deleteById(id);
    }

    public Room findRoomById(UUID id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new ApiException("Room not found with id: " + id, HttpStatus.NOT_FOUND));
    }
}
