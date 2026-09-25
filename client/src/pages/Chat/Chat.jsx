import { useEffect, useRef, useState } from "react";

import {
  FiArrowLeft,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiUser,
} from "react-icons/fi";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./Chat.css";

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] =
    useState(null);

  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const getUserId = () => {
    return user?._id || user?.id;
  };

  const getOtherParticipant = (
    participants = []
  ) => {
    const currentUserId = getUserId();

    if (!currentUserId) {
      return null;
    }

    return (
      participants.find(
        (participant) =>
          participant?._id !== currentUserId
      ) || null
    );
  };

  const getParticipantName = (
    participants = []
  ) => {
    const participant =
      getOtherParticipant(participants);

    if (participant?.name) {
      return participant.name;
    }

    if (participant?.email) {
      return participant.email.split("@")[0];
    }

    return "User";
  };

  const fetchConversation = async () => {
    try {
      setError("");

      const response = await api.get(
        `/messages/conversation/${conversationId}`
      );

      setConversation(
        response.data?.conversation || null
      );
    } catch (error) {
      console.error(
        "Fetch conversation error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load this conversation."
      );
    }
  };

  const fetchMessages = async () => {
    try {
      setError("");

      const response = await api.get(
        `/messages/conversation/${conversationId}/messages`
      );

      setMessages(
        response.data?.messages || []
      );
    } catch (error) {
      console.error(
        "Fetch messages error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load messages."
      );
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await api.patch(
        `/messages/conversation/${conversationId}/read`
      );
    } catch (error) {
      console.error(
        "Mark messages as read error:",
        error
      );
    }
  };

  const loadChat = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([
        fetchConversation(),
        fetchMessages(),
      ]);

      await markMessagesAsRead();
    } catch (error) {
      console.error("Load chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    loadChat();
  }, [conversationId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText || sending) {
      return;
    }

    try {
      setSending(true);

      const response = await api.post(
        `/messages/conversation/${conversationId}`,
        {
          text: trimmedText,
        }
      );

      const newMessage =
        response.data?.data;

      if (newMessage) {
        setMessages((previousMessages) => [
          ...previousMessages,
          newMessage,
        ]);
      }

      setText("");

      textareaRef.current?.focus();
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  };

  const handleTextareaKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit(event);
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isOwnMessage = (message) => {
    const currentUserId = getUserId();

    if (!currentUserId) {
      return false;
    }

    const senderId =
      message?.sender?._id ||
      message?.sender;

    return (
      senderId?.toString() ===
      currentUserId.toString()
    );
  };

  const handleBack = () => {
    navigate("/messages");
  };

  if (loading) {
    return (
      <main className="chat-page">
        <div className="chat-container">
          <div className="chat-loading">
            <div className="chat-loading-icon">
              <FiMessageSquare />
            </div>

            <div className="chat-loading-title" />

            <div className="chat-loading-line" />
            <div className="chat-loading-line short" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !conversation) {
    return (
      <main className="chat-page">
        <div className="chat-container">
          <div className="chat-error-state">
            <div className="chat-state-icon error">
              <FiMessageSquare />
            </div>

            <h1>
              Unable to open conversation
            </h1>

            <p>{error}</p>

            <div className="chat-error-actions">
              <button
                type="button"
                className="chat-secondary-button"
                onClick={handleBack}
              >
                <FiArrowLeft />
                <span>Back to Messages</span>
              </button>

              <button
                type="button"
                className="chat-primary-button"
                onClick={loadChat}
              >
                <FiRefreshCw />
                <span>Try again</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const participantName =
    getParticipantName(
      conversation?.participants
    );

  const otherParticipant =
    getOtherParticipant(
      conversation?.participants
    );

  return (
    <main className="chat-page">
      <div className="chat-container">

        {/* Chat header */}

        <header className="chat-header">
          <button
            type="button"
            className="chat-back-button"
            onClick={handleBack}
            aria-label="Back to messages"
            title="Back to messages"
          >
            <FiArrowLeft />
          </button>

          <div className="chat-user-avatar">
            {otherParticipant?.name ? (
              otherParticipant.name
                .charAt(0)
                .toUpperCase()
            ) : (
              <FiUser />
            )}
          </div>

          <div className="chat-header-info">
            <h1>{participantName}</h1>

            <p>
              {conversation?.item?.title ||
                "Lost & Found Item"}
            </p>
          </div>
        </header>

        {/* Item information */}

        {conversation?.item && (
          <div className="chat-item-info">
            <FiMessageSquare />

            <div>
              <span>Conversation about</span>

              <strong>
                {conversation.item.title}
              </strong>
            </div>
          </div>
        )}

        {/* Messages */}

        <section className="chat-messages">

          {error && (
            <div className="chat-inline-error">
              <span>{error}</span>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  fetchMessages();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <div className="chat-state-icon">
                <FiMessageSquare />
              </div>

              <h2>No messages yet</h2>

              <p>
                Start the conversation by sending
                a message below.
              </p>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => {
                const ownMessage =
                  isOwnMessage(message);

                return (
                  <div
                    key={message._id}
                    className={`message-row ${
                      ownMessage
                        ? "own"
                        : "other"
                    }`}
                  >
                    <div
                      className={`message-bubble ${
                        ownMessage
                          ? "own"
                          : "other"
                      }`}
                    >
                      <p>{message.text}</p>

                      <span className="message-time">
                        {formatMessageTime(
                          message.createdAt
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>
          )}
        </section>

        {/* Message input */}

        <form
          className="chat-input-container"
          onSubmit={handleSubmit}
        >
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) =>
              setText(event.target.value)
            }
            onKeyDown={
              handleTextareaKeyDown
            }
            placeholder="Write a message..."
            rows={1}
            disabled={sending}
          />

          <button
            type="submit"
            className="chat-send-button"
            disabled={
              sending || !text.trim()
            }
            aria-label="Send message"
            title="Send message"
          >
            <FiSend />
          </button>
        </form>

      </div>
    </main>
  );
};

export default Chat;