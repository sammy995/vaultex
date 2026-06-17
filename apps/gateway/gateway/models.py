from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str = "qwen3:4b"
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: str


class SessionConfigRequest(BaseModel):
    provider: str  # "anthropic" | "openai" | "ollama"
    model: str
    api_key: Optional[str] = None
    ollama_url: Optional[str] = "http://localhost:11434"


class SessionConfigResponse(BaseModel):
    session_id: str
    provider: str
    model: str


class TokenRequest(BaseModel):
    role: str
    subject: str = "user"


class TokenResponse(BaseModel):
    token: str
    role: str
    expires_in: int  # seconds


# ---------------------------------------------------------------------------
# User / Auth models
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    role: str = "junior_analyst"

    @field_validator("username")
    @classmethod
    def username_len(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 40:
            raise ValueError("Username must be 2–40 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    token: str
    expires_in: int
