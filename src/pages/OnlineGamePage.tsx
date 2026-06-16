import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageShell from '../components/PageShell';
import ChessBoard from '../components/ChessBoard';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import AnalysisPanel from '../components/game/AnalysisPanel';
import { 
  Flag, RotateCcw, Send, Check, X, ShieldAlert, Clock, 
  Smile, User, ArrowLeft, ArrowRight, ChevronsLeft, ChevronsRight,
  MessageSquare, History, Shield, Info, Award, Play
} from 'lucide-react';

export default function OnlineGamePage() {
  const { roomCode: paramRoomCode, code: paramCode } = useParams<{ roomCode?: string; code?: string }>();
  const roomCode = paramRoomCode || paramCode;
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [bestMoveArrow, setBestMoveArrow] = useState<{ from: string; to: string } | null>(null);

  if (!roomCode) {
    return (
      <PageShell>
        <div style={errorContainer}>
          <ShieldAlert size={48} style={{ color: '#ff6b6b', marginBottom: '16px' }} />
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#ff6b6b' }}>Invalid Room Code</h2>
          <button style={btnAction} onClick={() => navigate('/play/online')}>Back to Lobby</button>
        </div>
      </PageShell>
    );
  }

  // Hook details
  const {
    gameData,
    playerColor,
    fen,
    boardState,
    opponentOnline,
    disconnectBanner,
    abandonModal,
    drawOfferModal,
    takebackModal,
    pendingDrawOffer,
    pendingTakebackRequest,
    rematchOffer,
    gameOver,
    chatMessages,
    whiteTime,
    blackTime,
    preMove,
    handleSquareClick,
    handlePromotion,
    sendChatMessage,
    sendDrawOffer,
    acceptDraw,
    declineDraw,
    sendTakebackRequest,
    acceptTakeback,
    declineTakeback,
    resignGame,
    claimAbandonWin,
    dismissAbandon,
    sendRematchOffer,

    // Review controls
    reviewIndex,
    handleFirstMove,
    handlePrevMove,
    handleNextMove,
    handleLastMove,
    handleMoveClick
  } = useOnlineGame(roomCode);

  const [activeRightTab, setActiveRightTab] = useState<'moves' | 'chat'>('moves');
  const [chatInput, setChatInput] = useState('');
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showRematchOfferModal, setShowRematchOfferModal] = useState(true);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load tournament ID if this is a tournament match
  useEffect(() => {
    if (gameData?.id) {
      supabase
        .from('tournament_pairings')
        .select('tournament_id')
        .eq('game_id', gameData.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.tournament_id) {
            setTournamentId(data.tournament_id);
          }
        });
    }
  }, [gameData?.id]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeRightTab]);

  if (!gameData) {
    return (
      <PageShell>
        <div style={loadingContainer}>
          <div style={loadingSpinner} />
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Establishing connection to room {roomCode}...</p>
        </div>
      </PageShell>
    );
  }

  const isWhite = playerColor === 'w';
  const myElo = isWhite ? gameData.white_elo : gameData.black_elo;
  const oppElo = isWhite ? gameData.black_elo : gameData.white_elo;
  const myUsername = isWhite ? gameData.white_username : gameData.black_username;
  const oppUsername = isWhite ? gameData.black_username : gameData.white_username;
  const myTime = isWhite ? whiteTime : blackTime;
  const oppTime = isWhite ? blackTime : whiteTime;

  // Active turn indicator
  const activeChessColor = new Chess(fen).turn();
  const isMyTurn = activeChessColor === playerColor;

  const formatTime = (timeInSeconds: number) => {
    if (timeInSeconds <= 0) return '0:00.0';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    if (timeInSeconds > 60) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
      const tenths = Math.floor((timeInSeconds % 1) * 10);
      return `${secs}.${tenths}`;
    }
  };

  const getClockBg = (timeInSeconds: number, isActive: boolean) => {
    if (!isActive) return 'rgba(0, 0, 0, 0.2)';
    if (timeInSeconds < 20) return 'rgba(239, 68, 68, 0.15)'; // soft red low time
    return 'rgba(212, 175, 55, 0.1)'; // soft gold active
  };

  const getClockColor = (timeInSeconds: number, isActive: boolean) => {
    if (!isActive) return 'var(--text-muted)';
    if (timeInSeconds < 20) return '#ff6b6b';
    return 'var(--gold)';
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleQuickSend = (text: string) => {
    sendChatMessage(text);
  };

  return (
    <PageShell>
      <div style={outerContainer}>
        {/* Disconnection Warning Banner */}
        {disconnectBanner && !gameOver && (
          <div style={disconnectionBanner}>
            <ShieldAlert size={16} />
            <span>Opponent disconnected. Reconnecting... (Claim win possible in 60s)</span>
          </div>
        )}

        <div style={gameLayoutGrid}>
          {/* LEFT: Game Column (Opponent Bar, Board, Player Bar) */}
          <div style={boardColumn}>
            
            {/* OPPONENT INFO BAR */}
            <div style={infoBar}>
              <div style={playerDetails}>
                <div style={avatar}>
                  <User size={18} style={{ color: 'var(--text-muted)' }} />
                  {opponentOnline ? <div style={onlineDot} /> : <div style={offlineDot} />}
                </div>
                <div>
                  <div style={usernameRow}>
                    <span style={playerUsername}>{oppUsername || 'Opponent'}</span>
                    <span style={playerRating}>({oppElo || 1200})</span>
                  </div>
                  <span style={turnIndicatorStyle}>
                    {!isMyTurn && !gameOver ? <span style={pulseText}>● Opponent's Turn</span> : null}
                  </span>
                </div>
              </div>

              {/* Opponent clock */}
              {gameData.time_control && (
                <div style={{
                  ...clockDisplay,
                  background: getClockBg(oppTime, !isMyTurn),
                  color: getClockColor(oppTime, !isMyTurn),
                  borderColor: !isMyTurn ? 'var(--gold)' : 'transparent',
                }}>
                  <Clock size={16} />
                  <span>{formatTime(oppTime)}</span>
                </div>
              )}
            </div>

            {/* CHESS BOARD INTERACTIVE LAYER */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ 
                width: '100%', 
                cursor: isMyTurn ? 'pointer' : 'default',
              }}>
                <ChessBoard 
                  customState={boardState} 
                  customHandleSquareClick={handleSquareClick}
                  customHandlePromotion={handlePromotion}
                  bestMoveArrow={bestMoveArrow}
                />
              </div>

              {/* Turn indicator ribbon */}
              <div style={{
                ...turnBanner,
                background: isMyTurn ? 'rgba(129, 182, 76, 0.15)' : 'rgba(212, 175, 55, 0.08)',
                color: isMyTurn ? '#81b64c' : 'var(--text-secondary)',
                borderColor: isMyTurn ? '#81b64c' : 'var(--border)'
              }}>
                {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
                {preMove && <span style={preMoveBadge}>Pre-move: {preMove.from}→{preMove.to}</span>}
              </div>
            </div>

            {/* PLAYER INFO BAR */}
            <div style={infoBar}>
              <div style={playerDetails}>
                <div style={{ ...avatar, borderColor: 'var(--gold)' }}>
                  <User size={18} style={{ color: 'var(--gold)' }} />
                  <div style={onlineDot} />
                </div>
                <div>
                  <div style={usernameRow}>
                    <span style={playerUsername}>{myUsername || 'You'}</span>
                    <span style={playerRating}>({myElo || 1200})</span>
                  </div>
                  <span style={turnIndicatorStyle}>
                    {isMyTurn && !gameOver ? <span style={{ color: '#81b64c', fontWeight: 700 }}>● Your Turn</span> : null}
                  </span>
                </div>
              </div>

              {/* Player clock */}
              {gameData.time_control && (
                <div style={{
                  ...clockDisplay,
                  background: getClockBg(myTime, isMyTurn),
                  color: getClockColor(myTime, isMyTurn),
                  borderColor: isMyTurn ? 'var(--gold)' : 'transparent',
                }}>
                  <Clock size={16} />
                  <span>{formatTime(myTime)}</span>
                </div>
              )}
            </div>

            {/* BOTTOM CONTROL ACTIONS BAR */}
            <div style={controlActionsBar}>
              <button 
                style={{ ...btnControl, opacity: gameOver ? 0.4 : 1 }} 
                disabled={!!gameOver}
                onClick={sendDrawOffer}
              >
                <RotateCcw size={16} />
                <span>{pendingDrawOffer ? 'Offer Sent...' : 'Offer Draw'}</span>
              </button>
              
              <button 
                style={{ ...btnControl, opacity: gameOver || history.length === 0 ? 0.4 : 1 }} 
                disabled={!!gameOver || history.length === 0}
                onClick={sendTakebackRequest}
              >
                <ArrowLeft size={16} />
                <span>{pendingTakebackRequest ? 'Request Sent...' : 'Request Takeback'}</span>
              </button>

              <button 
                style={{ ...btnControlResign, opacity: gameOver ? 0.4 : 1 }} 
                disabled={!!gameOver}
                onClick={() => setShowResignConfirm(true)}
              >
                <Flag size={16} />
                <span>Resign</span>
              </button>
            </div>

          </div>

          {/* RIGHT: Sidebar Panel (Moves list & Chat messages, or Analysis) */}
          <div style={rightSidebar}>
            {showAnalysis ? (
              <AnalysisPanel
                history={boardState.history}
                onJumpToMove={handleMoveClick}
                onSelectArrow={(arrow: any) => setBestMoveArrow(arrow)}
                onCloseAnalysis={() => {
                  setShowAnalysis(false);
                  setBestMoveArrow(null);
                  handleLastMove();
                }}
                onAnalysisComplete={() => {}}
              />
            ) : (
              <>
                {/* TAB SELECTORS */}
                <div style={tabsHeader}>
                  <button
                    style={{
                      ...tabBtn,
                      background: activeRightTab === 'moves' ? 'var(--bg-card)' : 'transparent',
                      color: activeRightTab === 'moves' ? 'var(--gold)' : 'var(--text-secondary)',
                      borderBottom: activeRightTab === 'moves' ? '2px solid var(--gold)' : '2px solid transparent'
                    }}
                    onClick={() => setActiveRightTab('moves')}
                  >
                    <History size={16} />
                    <span>Moves</span>
                  </button>

                  <button
                    style={{
                      ...tabBtn,
                      background: activeRightTab === 'chat' ? 'var(--bg-card)' : 'transparent',
                      color: activeRightTab === 'chat' ? 'var(--gold)' : 'var(--text-secondary)',
                      borderBottom: activeRightTab === 'chat' ? '2px solid var(--gold)' : '2px solid transparent'
                    }}
                    onClick={() => setActiveRightTab('chat')}
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>
                </div>

                {/* TAB CONTENT: MOVES HISTORY */}
                {activeRightTab === 'moves' && (
                  <div style={movesHistoryContainer}>
                    <div style={movesScrollable}>
                      {history.length === 0 ? (
                        <div style={emptyHistory}>No moves played yet. Start the match!</div>
                      ) : (
                        <div style={movesGrid}>
                          {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => {
                            const moveNum = i + 1;
                            const whiteMove = history[i * 2];
                            const blackMove = history[i * 2 + 1];
                            
                            const isWhiteActiveReview = reviewIndex === i * 2;
                            const isBlackActiveReview = reviewIndex === i * 2 + 1;

                            return (
                              <div key={moveNum} style={moveRow}>
                                <span style={moveNumberCol}>{moveNum}.</span>
                                
                                <button
                                  style={{
                                    ...moveBtn,
                                    color: isWhiteActiveReview ? '#0a0a14' : 'var(--text-primary)',
                                    background: isWhiteActiveReview ? 'var(--gold)' : 'transparent',
                                    fontWeight: isWhiteActiveReview ? 800 : 500
                                  }}
                                  onClick={() => handleMoveClick(i * 2)}
                                >
                                  {whiteMove.san}
                                </button>

                                {blackMove ? (
                                  <button
                                    style={{
                                      ...moveBtn,
                                      color: isBlackActiveReview ? '#0a0a14' : 'var(--text-primary)',
                                      background: isBlackActiveReview ? 'var(--gold)' : 'transparent',
                                      fontWeight: isBlackActiveReview ? 800 : 500
                                    }}
                                    onClick={() => handleMoveClick(i * 2 + 1)}
                                  >
                                    {blackMove.san}
                                  </button>
                                ) : (
                                  <span style={moveBtnPlaceholder} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* REVIEW CONTROLS PANEL */}
                    {history.length > 0 && (
                      <div style={reviewControls}>
                        <button style={btnReviewIcon} onClick={handleFirstMove} title="First Move">
                          <ChevronsLeft size={16} />
                        </button>
                        <button style={btnReviewIcon} onClick={handlePrevMove} title="Previous Move">
                          <ArrowLeft size={16} />
                        </button>
                        <button style={btnReviewIcon} onClick={handleNextMove} title="Next Move">
                          <ArrowRight size={16} />
                        </button>
                        <button style={btnReviewIcon} onClick={handleLastMove} title="Last Move (Go Live)">
                          <ChevronsRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: IN-GAME CHAT */}
                {activeRightTab === 'chat' && (
                  <div style={chatContainer}>
                    
                    {/* CHAT LOGS */}
                    <div style={chatLogsScrollable}>
                      {chatMessages.length === 0 ? (
                        <div style={emptyLogs}>Send a message to greet your opponent!</div>
                      ) : (
                        chatMessages.map((msg, index) => {
                          const isMe = msg.username === myUsername;
                          return (
                            <div key={index} style={chatRow}>
                              <span style={{ 
                                ...chatSender, 
                                color: isMe ? 'var(--gold)' : 'var(--text-secondary)'
                              }}>
                                {msg.username}:
                              </span>
                              <span style={chatMessageText}>{msg.message}</span>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* QUICK DIALOG CHIPS */}
                    <div style={quickSendRow}>
                      <button style={btnChip} onClick={() => handleQuickSend('Good luck!')}>GL HF!</button>
                      <button style={btnChip} onClick={() => handleQuickSend('Good game!')}>GG</button>
                      <button style={btnChip} onClick={() => handleQuickSend('Nice move!')}>Nice move!</button>
                      <button style={btnChip} onClick={() => handleQuickSend('Thanks!')}>Thanks</button>
                    </div>

                    {/* INPUT FORM */}
                    <form onSubmit={handleSendChat} style={chatForm}>
                      <input
                        type="text"
                        placeholder="Type message (max 100 chars)..."
                        maxLength={100}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        style={chatInputStyle}
                      />
                      <button type="submit" style={btnSend}>
                        <Send size={14} />
                      </button>
                    </form>

                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION RESIGNATION MODAL */}
      {showResignConfirm && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <ShieldAlert size={40} style={{ color: '#ff6b6b', marginBottom: '16px' }} />
            <h3 style={modalTitle}>Resign Match?</h3>
            <p style={modalText}>Are you sure you want to resign the game? This will count as a loss and affect your ELO rating.</p>
            <div style={modalActionRow}>
              <button style={btnModalCancel} onClick={() => setShowResignConfirm(false)}>No, Keep Playing</button>
              <button style={btnModalConfirm} onClick={() => { resignGame(); setShowResignConfirm(false); }}>Yes, Resign</button>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING DRAW OFFER MODAL */}
      {drawOfferModal && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <Info size={40} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
            <h3 style={modalTitle}>Draw Offered</h3>
            <p style={modalText}>Your opponent has offered a draw. Would you like to accept?</p>
            <div style={modalActionRow}>
              <button style={btnModalCancel} onClick={declineDraw}>Decline Draw</button>
              <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={acceptDraw}>Accept Draw</button>
            </div>
          </div>
        </div>
      )}

      {/* INCOMING TAKEBACK REQUEST MODAL */}
      {takebackModal && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <Info size={40} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
            <h3 style={modalTitle}>Takeback Requested</h3>
            <p style={modalText}>Your opponent is asking to undo their last move. Allow it?</p>
            <div style={modalActionRow}>
              <button style={btnModalCancel} onClick={declineTakeback}>Decline</button>
              <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={acceptTakeback}>Allow Takeback</button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM ABANDON WIN MODAL */}
      {abandonModal && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <Shield size={40} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
            <h3 style={modalTitle}>Opponent Abandoned</h3>
            <p style={modalText}>Your opponent has been offline for over 60 seconds. You can claim victory now or continue waiting.</p>
            <div style={modalActionRow}>
              <button style={btnModalCancel} onClick={dismissAbandon}>Keep Waiting</button>
              <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={claimAbandonWin}>Claim Victory</button>
            </div>
          </div>
        </div>
      )}

      {/* REMATCH OFFER POPUP MODAL */}
      {rematchOffer && showRematchOfferModal && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <Play size={40} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
            <h3 style={modalTitle}>Rematch Offered</h3>
            <p style={modalText}>{rematchOffer.challenger} has challenged you to a rematch with colors swapped!</p>
            <div style={modalActionRow}>
              <button style={btnModalCancel} onClick={() => setShowRematchOfferModal(false)}>Decline Challenge</button>
              <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={() => navigate(`/play/online/${rematchOffer.roomCode}`)}>
                Accept Rematch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER DIALOG OVERLAY */}
      {gameOver && (() => {
        const getResultTitleAndReason = () => {
          let title = 'Draw';
          let reason = '';
          
          if (gameOver.winner === 'white') {
            title = 'White Wins';
          } else if (gameOver.winner === 'black') {
            title = 'Black Wins';
          }
          
          if (gameOver.type === 'win') {
            reason = 'by checkmate';
          } else if (gameOver.type === 'resign') {
            reason = 'by resignation';
          } else if (gameOver.type === 'timeout') {
            reason = 'on time';
          } else if (gameOver.type === 'abandoned') {
            reason = 'by default (opponent left)';
          } else if (gameOver.type === 'draw') {
            const msg = gameOver.message.toLowerCase();
            if (msg.includes('stalemate')) {
              reason = 'by stalemate';
            } else if (msg.includes('repetition')) {
              reason = 'by repetition';
            } else if (msg.includes('insufficient')) {
              reason = 'by insufficient material';
            } else {
              reason = 'by mutual agreement';
            }
          } else {
            reason = gameOver.message;
          }
          
          return { title, reason };
        };

        const { title, reason } = getResultTitleAndReason();

        return (
          <div style={modalBackdrop}>
            <div style={{ ...modalCard, maxWidth: '400px' }}>
              <Award size={48} style={{ color: 'var(--gold)', marginBottom: '16px' }} />
              <h3 style={modalTitle}>{title}</h3>
              <p style={{ ...modalText, fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {reason}
              </p>
              
              {/* ELO adjustment */}
              {gameData.is_rated && gameOver.eloChange !== undefined && (
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: gameOver.eloChange >= 0 ? '#81b64c' : '#ff6b6b',
                  background: 'rgba(0,0,0,0.25)',
                  padding: '8px 20px',
                  borderRadius: '24px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Award size={16} />
                  <span>Elo Change: {gameOver.eloChange >= 0 ? `+${gameOver.eloChange}` : gameOver.eloChange}</span>
                </div>
              )}

               <div style={modalActionRow}>
                {tournamentId ? (
                  <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={() => navigate(`/tournaments/${tournamentId}`)}>
                    Back to Tournament
                  </button>
                ) : rematchOffer ? (
                  <button style={{ ...btnModalConfirm, background: '#81b64c', color: '#ffffff' }} onClick={() => navigate(`/play/online/${rematchOffer.roomCode}`)}>
                    Accept Rematch
                  </button>
                ) : (
                  <button style={{ ...btnModalConfirm, background: 'var(--gold)', color: '#0a0a14' }} onClick={sendRematchOffer}>
                    Rematch
                  </button>
                )}
                <button style={btnModalCancel} onClick={() => { setShowAnalysis(true); setGameOver(null); }}>
                  Analyze Game
                </button>
                {!tournamentId && (
                  <button style={btnModalCancel} onClick={() => navigate('/play/online')}>
                    New Game
                  </button>
                )}
                <button style={btnModalCancel} onClick={() => navigate(tournamentId ? `/tournaments/${tournamentId}` : '/play/online')}>
                  {tournamentId ? 'Lobby' : 'Back to Lobby'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </PageShell>
  );
}

// Styling definitions
const outerContainer = {
  width: '100%',
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '16px 20px',
  boxSizing: 'border-box' as const
};

const errorContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh'
};

const loadingContainer = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh'
};

const loadingSpinner = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  border: '3px solid rgba(212,175,55,0.06)',
  borderTopColor: 'var(--gold)',
  animation: 'spin 1s linear infinite'
};

const disconnectionBanner = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '8px',
  color: '#ff6b6b',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginBottom: '16px',
  animation: 'pulse 2s infinite ease-in-out'
};

const gameLayoutGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: '24px',
  alignItems: 'start'
};

const boardColumn = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
  maxWidth: '560px',
  width: '100%',
  margin: '0 auto'
};

const infoBar = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '10px 16px'
};

const playerDetails = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const avatar = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const
};

const onlineDot = {
  position: 'absolute' as const,
  bottom: '-1px',
  right: '-1px',
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  background: '#81b64c',
  border: '2px solid var(--bg-card)'
};

const offlineDot = {
  position: 'absolute' as const,
  bottom: '-1px',
  right: '-1px',
  width: '9px',
  height: '9px',
  borderRadius: '50%',
  background: 'gray',
  border: '2px solid var(--bg-card)'
};

const usernameRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const playerUsername = {
  fontWeight: 700,
  fontSize: '14.5px',
  color: 'var(--text-primary)'
};

const playerRating = {
  fontSize: '11px',
  color: 'var(--text-secondary)'
};

const turnIndicatorStyle = {
  fontSize: '11px',
  marginTop: '2px',
  display: 'block'
};

const pulseText = {
  color: 'var(--gold)',
  fontWeight: 500,
  animation: 'pulse 1.5s infinite ease-in-out'
};

const clockDisplay = {
  minWidth: '84px',
  minHeight: '34px',
  borderRadius: '6px',
  border: '1px solid transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontFamily: 'monospace',
  fontSize: '16px',
  fontWeight: 700,
  transition: 'all 0.15s'
};

const turnBanner = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 12px',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  fontWeight: 800,
  letterSpacing: '0.5px',
  borderRadius: '4px',
  border: '1px solid',
  marginTop: '6px'
};

const preMoveBadge = {
  fontSize: '9px',
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#ff6b6b',
  padding: '2px 6px',
  borderRadius: '4px',
  border: '1px solid rgba(239, 68, 68, 0.25)'
};

const controlActionsBar = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '10px',
  marginTop: '4px'
};

const btnControl = {
  minHeight: '38px',
  borderRadius: '6px',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-secondary)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.15s'
};

const btnControlResign = {
  ...btnControl,
  color: '#ff6b6b',
  background: 'rgba(255, 107, 107, 0.05)',
  borderColor: 'rgba(255, 107, 107, 0.15)'
};

const rightSidebar = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: '16px',
  minHeight: '420px',
  height: '540px',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden',
  boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
};

const tabsHeader = {
  display: 'flex',
  borderBottom: '1px solid var(--border)',
  background: 'rgba(0,0,0,0.1)'
};

const tabBtn = {
  flex: 1,
  minHeight: '46px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  transition: 'all 0.15s'
};

const movesHistoryContainer = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden'
};

const movesScrollable = {
  flex: 1,
  overflowY: 'auto' as const,
  padding: '16px'
};

const emptyHistory = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: 'var(--text-muted)',
  fontSize: '13px'
};

const movesGrid = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px'
};

const moveRow = {
  display: 'grid',
  gridTemplateColumns: '36px 1fr 1fr',
  alignItems: 'center',
  minHeight: '28px',
  fontSize: '13.5px'
};

const modalBackdrop = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0, 0, 0, 0.75)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalCard = {
  background: 'var(--bg-card, #1e1e2d)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '32px 24px',
  width: '90%',
  maxWidth: '400px',
  textAlign: 'center' as const,
  boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center'
};

const modalTitle = {
  fontFamily: 'Cinzel, serif',
  fontSize: '24px',
  color: '#ffffff',
  margin: '0 0 8px 0',
  fontWeight: 700
};

const modalText = {
  color: 'var(--text-secondary, #9ca3af)',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 20px 0'
};

const modalActionRow = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '10px',
  width: '100%'
};

const btnModalConfirm = {
  background: 'linear-gradient(135deg, #D4AF37, #FFD700)',
  color: '#000000',
  border: 'none',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.2s',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const btnModalCancel = {
  background: 'transparent',
  color: 'var(--text-secondary, #9ca3af)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  padding: '12px 20px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

