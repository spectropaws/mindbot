package com.mindbot.api.repository;

import com.mindbot.api.entity.KnowledgeBaseDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeBaseDocumentRepository extends JpaRepository<KnowledgeBaseDocument, Long> {
    List<KnowledgeBaseDocument> findByUserIdOrderByUploadedAtDesc(String userId);
    void deleteByUserId(String userId);
}
