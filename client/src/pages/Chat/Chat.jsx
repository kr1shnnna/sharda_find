import { useEffect, useRef, useState } from "react";

import {
  FiArrowLeft,
  FiMessageSquare,
  FiRefreshCw,
  FiSend,
  FiUser,
  FiPackage,
  FiCheckCircle,
  FiX,
} from "react-icons/fi";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { io } from "socket.io-client";

import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

import "./Chat.css";

const SOCKET_URL = "http://localhost:5000";

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

  const [socketError, setSocketError] =
    useState("");

  const [handoverLoading, setHandoverLoading] =
    useState(false);

  const [confirmationModal, setConfirmationModal] =
    useState(null);

  const messagesEndRef = useRef(null);

  const textareaRef = useRef(null);

  const socketRef = useRef(null);

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
          participant?._id?.toString() !==
          currentUserId.toString()
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

  /*
   * Fetch conversation information
   */

  const fetchConversation = async () => {
    try {
      const response = await api.get(
        `/messages/conversation-by-id/${conversationId}`
      );

      setConversation(
        response.data?.conversation || null
      );
    } catch (error) {
      console.error(
        "Fetch conversation error:",
        error
      );

      throw new Error(
        error.response?.data?.message ||
          "Unable to load this conversation."
      );
    }
  };

  /*
   * Fetch existing messages
   */

  const fetchMessages = async () => {
    try {
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

      throw new Error(
        error.response?.data?.message ||
          "Unable to load messages."
      );
    }
  };

  /*
   * Mark messages as read
   */

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

  /*
   * Load initial chat data
   */

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
      console.error(
        "Load chat error:",
        error
      );

      setError(
        error.message ||
          "Unable to load conversation."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Connect to Socket.IO
   */

  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    /*
     * Socket connected
     */

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      setSocketError("");

      socket.emit(
        "join-conversation",
        conversationId
      );
    });

    /*
     * Successfully joined conversation
     */

    socket.on(
      "conversation-joined",
      (data) => {
        console.log(
          "Joined conversation:",
          data.conversationId
        );
      }
    );

    /*
     * Receive new message
     */

    socket.on(
      "new-message",
      (newMessage) => {
        if (
          newMessage?.conversation?.toString() !==
          conversationId.toString()
        ) {
          return;
        }

        setMessages(
          (previousMessages) => {
            const alreadyExists =
              previousMessages.some(
                (message) =>
                  message._id ===
                  newMessage._id
              );

            if (alreadyExists) {
              return previousMessages;
            }

            return [
              ...previousMessages,
              newMessage,
            ];
          }
        );

        /*
         * If the other user sends a message
         * while this chat is open, mark it
         * as read.
         */

        if (
          newMessage.sender?._id?.toString() !==
          getUserId()?.toString()
        ) {
          markMessagesAsRead();
        }
      }
    );

    /*
     * Server rejected conversation join
     */

    socket.on(
      "conversation-error",
      (data) => {
        console.error(
          "Conversation socket error:",
          data?.message
        );

        setSocketError(
          data?.message ||
            "Unable to join conversation."
        );
      }
    );

    /*
     * Socket authentication error
     */

    socket.on(
      "connect_error",
      (error) => {
        console.error(
          "Socket connection error:",
          error.message
        );

        setSocketError(
          "Real-time connection could not be established."
        );
      }
    );

    /*
     * Socket disconnected
     */

    socket.on(
      "disconnect",
      (reason) => {
        console.log(
          "Socket disconnected:",
          reason
        );
      }
    );

    /*
     * Cleanup
     */

    return () => {
      socket.emit(
        "leave-conversation",
        conversationId
      );

      socket.disconnect();

      socketRef.current = null;
    };
  }, [conversationId, user]);

  /*
   * Load chat when page opens
   */

  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    loadChat();
  }, [conversationId, user]);

  /*
   * Scroll to latest message
   */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  /*
   * Finder handover
   */

  const handleFinderHandover = async () => {
    const itemId =
      conversation?.item?._id;

    if (!itemId) {
      return;
    }

    try {
      setHandoverLoading(true);

      setError("");

      const response = await api.patch(
        `/items/${itemId}/confirm-handover`
      );

      setConversation(
        (previousConversation) => ({
          ...previousConversation,
          item:
            response.data?.item ||
            previousConversation.item,
        })
      );

      setConfirmationModal(null);
    } catch (error) {
      console.error(
        "Confirm finder handover error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to confirm the handover."
      );
    } finally {
      setHandoverLoading(false);
    }
  };

  /*
   * Owner confirms receiving item
   */

  const handleOwnerReceived = async () => {
    const itemId =
      conversation?.item?._id;

    if (!itemId) {
      return;
    }

    try {
      setHandoverLoading(true);

      setError("");

      const response = await api.patch(
        `/items/${itemId}/confirm-received`
      );

      setConversation(
        (previousConversation) => ({
          ...previousConversation,
          item:
            response.data?.item ||
            previousConversation.item,
        })
      );

      setConfirmationModal(null);
    } catch (error) {
      console.error(
        "Confirm item receipt error:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Unable to confirm receiving the item."
      );
    } finally {
      setHandoverLoading(false);
    }
  };

  /*
   * Send message
   */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedText = text.trim();

    if (!trimmedText || sending) {
      return;
    }

    try {
      setSending(true);

      setError("");

      const response = await api.post(
        `/messages/conversation/${conversationId}`,
        {
          text: trimmedText,
        }
      );

      const newMessage =
        response.data?.data;

      /*
       * Add our own message immediately.
       *
       * The server also emits this message
       * through Socket.IO, so we check the
       * message ID to prevent duplication.
       */

      if (newMessage) {
        setMessages(
          (previousMessages) => {
            const alreadyExists =
              previousMessages.some(
                (message) =>
                  message._id ===
                  newMessage._id
              );

            if (alreadyExists) {
              return previousMessages;
            }

            return [
              ...previousMessages,
              newMessage,
            ];
          }
        );
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

  /*
   * Enter sends message.
   * Shift + Enter creates a new line.
   */

  const handleTextareaKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit(event);
    }
  };

  /*
   * Format message timestamp
   */

  const formatMessageTime = (
    dateString
  ) => {
    if (!dateString) {
      return "";
    }

    const date =
      new Date(dateString);

    if (
      Number.isNaN(date.getTime())
    ) {
      return "";
    }

    return date.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  /*
   * Check whether message belongs
   * to current user
   */

  const isOwnMessage = (
    message
  ) => {
    const currentUserId =
      getUserId();

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

  /*
   * Back to inbox
   */

  const handleBack = () => {
    navigate("/messages");
  };

  /*
   * Loading state
   */

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

  /*
   * Error state
   */

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

                <span>
                  Back to Messages
                </span>
              </button>

              <button
                type="button"
                className="chat-primary-button"
                onClick={loadChat}
              >
                <FiRefreshCw />

                <span>
                  Try again
                </span>
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

  const currentUserId =
    getUserId();

  const conversationItem =
    conversation?.item;

  const isFinder =
    conversationItem?.type ===
      "lost" &&
    conversationItem?.foundBy?.toString() ===
      currentUserId?.toString();

  const isOwner =
    conversationItem?.type ===
      "lost" &&
    conversationItem?.reportedBy?.toString() ===
      currentUserId?.toString();

  return (
    <main className="chat-page">
      <div className="chat-container">

        {/* Header */}

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
            <h1>
              {participantName}
            </h1>

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
              <span>
                Conversation about
              </span>

              <strong>
                {conversation.item.title}
              </strong>
            </div>
          </div>
        )}

        {/* Finder handover */}

        {isFinder &&
          conversationItem?.status ===
            "active" &&
          !conversationItem?.finderHandedOver && (
            <div className="chat-handover-section">
              <div className="chat-handover-content">
                <div className="chat-handover-icon">
                  <FiPackage />
                </div>

                <div>
                  <h3>
                    Ready to hand over the item?
                  </h3>

                  <p>
                    Once you have physically
                    given the item to the owner,
                    confirm the handover here.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="chat-handover-button"
                onClick={() =>
                  setConfirmationModal(
                    "finder"
                  )
                }
                disabled={
                  handoverLoading
                }
              >
                I Handed Over the Item
              </button>
            </div>
          )}

        {/* Owner confirmation */}

        {isOwner &&
          conversationItem?.status ===
            "active" &&
          conversationItem?.finderHandedOver &&
          !conversationItem?.returnConfirmedByOwner && (
            <div className="chat-handover-section">
              <div className="chat-handover-content">
                <div className="chat-handover-icon">
                  <FiCheckCircle />
                </div>

                <div>
                  <h3>
                    Did you receive the item?
                  </h3>

                  <p>
                    The finder has confirmed
                    handing over the item.
                    Confirm once you have
                    received it.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="chat-handover-button"
                onClick={() =>
                  setConfirmationModal(
                    "owner"
                  )
                }
                disabled={
                  handoverLoading
                }
              >
                Yes, I Got It
              </button>
            </div>
          )}

        {/* Socket status */}

        {socketError && (
          <div className="chat-socket-warning">
            {socketError}
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

              <h2>
                No messages yet
              </h2>

              <p>
                Start the conversation by
                sending a message below.
              </p>
            </div>
          ) : (
            <div className="message-list">
              {messages.map(
                (message) => {
                  const ownMessage =
                    isOwnMessage(
                      message
                    );

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
                        <p>
                          {message.text}
                        </p>

                        <span className="message-time">
                          {formatMessageTime(
                            message.createdAt
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }
              )}

              <div
                ref={messagesEndRef}
              />
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
              sending ||
              !text.trim()
            }
            aria-label="Send message"
            title="Send message"
          >
            <FiSend />
          </button>
        </form>

        {/* Confirmation Modal */}

        {confirmationModal && (
          <div
            className="chat-confirmation-overlay"
            onClick={() => {
              if (!handoverLoading) {
                setConfirmationModal(
                  null
                );
              }
            }}
          >
            <div
              className="chat-confirmation-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                className="chat-confirmation-close"
                onClick={() =>
                  !handoverLoading &&
                  setConfirmationModal(
                    null
                  )
                }
                aria-label="Close confirmation"
                title="Close"
                disabled={
                  handoverLoading
                }
              >
                <FiX />
              </button>

              <div className="chat-confirmation-icon">
                {confirmationModal ===
                "finder" ? (
                  <FiPackage />
                ) : (
                  <FiCheckCircle />
                )}
              </div>

              <h2>
                {confirmationModal ===
                "finder"
                  ? "Confirm Handover"
                  : "Confirm Receipt"}
              </h2>

              <p>
                {confirmationModal ===
                "finder"
                  ? "Please confirm that you have physically handed the item over to the owner."
                  : "Please confirm that you have received the item from the finder."}
              </p>

              <div className="chat-confirmation-actions">
                <button
                  type="button"
                  className="chat-confirmation-cancel"
                  onClick={() =>
                    setConfirmationModal(
                      null
                    )
                  }
                  disabled={
                    handoverLoading
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="chat-confirmation-confirm"
                  onClick={
                    confirmationModal ===
                    "finder"
                      ? handleFinderHandover
                      : handleOwnerReceived
                  }
                  disabled={
                    handoverLoading
                  }
                >
                  {handoverLoading
                    ? "Confirming..."
                    : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Chat;
