import { useEffect, useState } from "react";
import { FiMessageSquare, FiRefreshCw, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./Messages.css";

const Messages = () => {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUserId = () => {
    return user?._id || user?.id;
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/messages/conversations");

      setConversations(
        response.data?.conversations || []
      );
    } catch (error) {
      console.error(
        "Fetch conversations error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to load your conversations."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  const getOtherParticipant = (conversation) => {
    const currentUserId = getUserId();

    if (!currentUserId) {
      return null;
    }

    return (
      conversation.participants?.find(
        (participant) =>
          participant?._id !== currentUserId
      ) || null
    );
  };

  const getParticipantName = (conversation) => {
    const participant =
      getOtherParticipant(conversation);

    if (participant?.name) {
      return participant.name;
    }

    if (participant?.email) {
      return participant.email.split("@")[0];
    }

    return "User";
  };

  const formatTimestamp = (dateString) => {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const now = new Date();

    const isToday =
      date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);

    yesterday.setDate(now.getDate() - 1);

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    const difference =
      now.getTime() - date.getTime();

    const sevenDays =
      7 * 24 * 60 * 60 * 1000;

    if (difference < sevenDays && difference >= 0) {
      return date.toLocaleDateString([], {
        weekday: "short",
      });
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "short",
      year:
        date.getFullYear() !== now.getFullYear()
          ? "numeric"
          : undefined,
    });
  };

  const getConversationPreview = (conversation) => {
    if (conversation.lastMessage?.trim()) {
      return conversation.lastMessage;
    }

    return "No messages yet";
  };

  const handleConversationClick = (
    conversationId
  ) => {
    if (!conversationId) {
      return;
    }

    navigate(`/messages/${conversationId}`);
  };

  if (loading) {
    return (
      <main className="messages-page">
        <div className="messages-container">
          <div className="messages-header">
            <div>
              <div className="messages-skeleton-title" />
              <div className="messages-skeleton-subtitle" />
            </div>
          </div>

          <div className="messages-list">
            {[1, 2, 3].map((item) => (
              <div
                className="conversation-skeleton"
                key={item}
              >
                <div className="messages-skeleton-avatar" />

                <div className="messages-skeleton-content">
                  <div className="messages-skeleton-name" />
                  <div className="messages-skeleton-message" />
                </div>

                <div className="messages-skeleton-time" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="messages-page">
        <div className="messages-container">
          <div className="messages-header">
            <div>
              <h1>Messages</h1>
              <p>
                Your conversations about lost and
                found items.
              </p>
            </div>
          </div>

          <div className="messages-state">
            <div className="messages-state-icon error">
              <FiMessageSquare />
            </div>

            <h2>Unable to load messages</h2>

            <p>{error}</p>

            <button
              type="button"
              className="messages-retry-button"
              onClick={fetchConversations}
            >
              <FiRefreshCw />
              <span>Try again</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="messages-page">
      <div className="messages-container">
        <header className="messages-header">
          <div>
            <span className="messages-eyebrow">
              Inbox
            </span>

            <h1>Messages</h1>

            <p>
              Your conversations about lost and
              found items.
            </p>
          </div>

          {conversations.length > 0 && (
            <div className="messages-count">
              {conversations.length}{" "}
              {conversations.length === 1
                ? "conversation"
                : "conversations"}
            </div>
          )}
        </header>

        {conversations.length === 0 ? (
          <div className="messages-state">
            <div className="messages-state-icon">
              <FiMessageSquare />
            </div>

            <h2>No conversations yet</h2>

            <p>
              When you start a conversation about a
              lost or found item, it will appear here.
            </p>

            <button
              type="button"
              className="messages-browse-button"
              onClick={() => navigate("/browse")}
            >
              Browse Items
            </button>
          </div>
        ) : (
          <section className="messages-list">
            {conversations.map((conversation) => {
              const participant =
                getOtherParticipant(conversation);

              const participantName =
                getParticipantName(conversation);

              const item = conversation.item;

              return (
                <button
                  type="button"
                  className="conversation-card"
                  key={conversation._id}
                  onClick={() =>
                    handleConversationClick(
                      conversation._id
                    )
                  }
                >
                  <div className="conversation-avatar">
                    {participant?.name ? (
                      participant.name
                        .charAt(0)
                        .toUpperCase()
                    ) : (
                      <FiUser />
                    )}
                  </div>

                  <div className="conversation-content">
                    <div className="conversation-top">
                      <h2>
                        {participantName}
                      </h2>

                      <span className="conversation-time">
                        {formatTimestamp(
                          conversation.updatedAt
                        )}
                      </span>
                    </div>

                    <div className="conversation-item">
                      {item?.title ||
                        "Lost & Found Item"}
                    </div>

                    <p className="conversation-preview">
                      {getConversationPreview(
                        conversation
                      )}
                    </p>
                  </div>

                  <span className="conversation-arrow">
                    →
                  </span>
                </button>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
};

export default Messages;