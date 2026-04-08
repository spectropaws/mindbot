package com.mindbot.api.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User {
    
    @Id
    private String id; // UUID string from Supabase
    
    private String email;

    @OneToMany(mappedBy = "user")
    private List<Chat> chats;
}
