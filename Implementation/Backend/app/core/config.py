from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "StrawCRM API"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"

    # Firebase Authentication
    # Used to verify Firebase ID Tokens issued by the frontend
    FIREBASE_PROJECT_ID: str = Field(default="strawcrm-98ee3", alias="FIREBASE_PROJECT_ID")

    # Attachment Storage Strategy
    # Attachments smaller than this limit (in KB) are stored in Firestore as base64.
    # Attachments equal to or larger are stored in persistent file storage with streaming URL.
    ATTACHMENT_INLINE_LIMIT_KB: int = Field(default=500, alias="ATTACHMENT_INLINE_LIMIT_KB")

    # AI Configuration (Google Gemini)
    GEMINI_API_KEY: str = Field(default="", alias="GEMINI_API_KEY")

    # Email & SMTP Configuration (Gmail SMTP / Standard Library smtplib)
    # Brevo (Sendinblue) HTTPS REST API (Primary for cloud sending to arbitrary recipients)
    BREVO_API_KEY: str = Field(default="", alias="BREVO_API_KEY")
    BREVO_SENDER_EMAIL: str = Field(default="avinash48as@gmail.com", alias="BREVO_SENDER_EMAIL")
    BREVO_SENDER_NAME: str = Field(default="StrawCRM Notifications", alias="BREVO_SENDER_NAME")

    # Resend HTTPS REST API
    RESEND_API_KEY: str = Field(default="REDACTED_RESEND_API_KEY", alias="RESEND_API_KEY")
    RESEND_FROM: str = Field(default="StrawCRM <onboarding@resend.dev>", alias="RESEND_FROM")
    SMTP_HOST: str = Field(default="smtp.gmail.com", alias="SMTP_HOST")
    SMTP_PORT: int = Field(default=587, alias="SMTP_PORT")
    SMTP_USER: str = Field(default="avinash48as@gmail.com", alias="SMTP_USER")
    SMTP_PASSWORD: str = Field(default="REDACTED_SMTP_PASSWORD", alias="SMTP_PASSWORD")
    SMTP_FROM_NAME: str = Field(default="StrawCRM Notifications", alias="SMTP_FROM_NAME")

    # Security & CORS
    FRONTEND_URL: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
