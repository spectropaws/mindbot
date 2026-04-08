package com.mindbot.api.repository;

import com.mindbot.api.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatRepository extends JpaRepository<Chat, String> {
    List<Chat> findByUserIdOrderByCreatedAtDesc(String userId);
}
