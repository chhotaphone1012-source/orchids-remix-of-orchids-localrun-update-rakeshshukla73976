"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Zap, Star, Trophy, Heart, Shield, Magnet, Rocket } from "lucide-react";

interface GameProps {
  level: number;
  onComplete: (points: number) => void;
  onGameOver: () => void;
  soundEnabled: boolean;
  isPaused?: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "ground" | "air" | "spike" | "gap";
  passed: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
  type: "gold" | "silver" | "diamond";
}

interface PowerUp {
  x: number;
  y: number;
  type: "shield" | "magnet" | "double" | "rocket";
  collected: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
}

const GROUND_Y = 380;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 60;
const GRAVITY = 0.8;
const JUMP_FORCE = -16;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;

export default function EndlessRunner({ level, onComplete, onGameOver, soundEnabled, isPaused: externalPaused }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameSpeed, setGameSpeed] = useState(5 + level * 0.5);
  const [isJumping, setIsJumping] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const [playerY, setPlayerY] = useState(GROUND_Y - PLAYER_HEIGHT);
  const [velocityY, setVelocityY] = useState(0);
  const [doubleJumpAvailable, setDoubleJumpAvailable] = useState(true);
  
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [coinItems, setCoinItems] = useState<Coin[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  
  const [activePowerUps, setActivePowerUps] = useState({
    shield: false,
    magnet: false,
    double: false,
    rocket: false
  });
  
  const [countdown, setCountdown] = useState(3);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1200);
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [lastCoinTime, setLastCoinTime] = useState(0);
  
  const [groundOffset, setGroundOffset] = useState(0);
  const [backgroundOffset, setBackgroundOffset] = useState(0);
  const [midgroundOffset, setMidgroundOffset] = useState(0);

  const playerRef = useRef({
    y: GROUND_Y - PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
    doubleJumpAvailable: true
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !gameStarted) {
      setGameStarted(true);
      generateInitialElements();
    }
  }, [countdown, gameStarted]);

  const playGameSound = (type: "jump" | "coin" | "hit" | "powerup" | "levelup") => {
    if (!soundEnabled) return;
    const sounds: Record<string, string> = {
      jump: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
      coin: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3",
      hit: "https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3",
      powerup: "https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3",
      levelup: "https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3"
    };
    const audio = new Audio(sounds[type]);
    audio.volume = 0.3;
    audio.play().catch(() => {});
  };

  const generateInitialElements = () => {
    const initialObstacles: Obstacle[] = [];
    const initialCoins: Coin[] = [];
    const initialPowerUps: PowerUp[] = [];
    const initialPlatforms: Platform[] = [];
    
    for (let i = 0; i < 10; i++) {
      const x = GAME_WIDTH + i * 300 + Math.random() * 200;
      initialObstacles.push(generateObstacle(x));
    }
    
    for (let i = 0; i < 30; i++) {
      const x = GAME_WIDTH + i * 100 + Math.random() * 50;
      const y = GROUND_Y - 50 - Math.random() * 150;
      const types: ("gold" | "silver" | "diamond")[] = ["gold", "gold", "gold", "silver", "silver", "diamond"];
      initialCoins.push({
        x,
        y,
        collected: false,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
    
    for (let i = 0; i < 5; i++) {
      const x = GAME_WIDTH + i * 600 + Math.random() * 300;
      const types: ("shield" | "magnet" | "double" | "rocket")[] = ["shield", "magnet", "double", "rocket"];
      initialPowerUps.push({
        x,
        y: GROUND_Y - 100 - Math.random() * 100,
        type: types[Math.floor(Math.random() * types.length)],
        collected: false
      });
    }
    
    for (let i = 0; i < 8; i++) {
      const x = GAME_WIDTH + i * 400 + Math.random() * 200;
      initialPlatforms.push({
        x,
        y: GROUND_Y - 100 - Math.random() * 80,
        width: 100 + Math.random() * 100
      });
    }
    
    setObstacles(initialObstacles);
    setCoinItems(initialCoins);
    setPowerUps(initialPowerUps);
    setPlatforms(initialPlatforms);
  };

  const generateObstacle = (x: number): Obstacle => {
    const types: ("ground" | "air" | "spike")[] = ["ground", "ground", "air", "spike"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let width = 40 + Math.random() * 40;
    let height = 40 + Math.random() * 30;
    let y = GROUND_Y - height;
    
    if (type === "air") {
      height = 30;
      y = GROUND_Y - 80 - Math.random() * 60;
      width = 60 + Math.random() * 40;
    } else if (type === "spike") {
      width = 30;
      height = 40;
      y = GROUND_Y - height;
    }
    
    return { x, y, width, height, type, passed: false };
  };

  const jump = useCallback(() => {
    const player = playerRef.current;
    
    if (!player.isJumping) {
      player.velocityY = JUMP_FORCE;
      player.isJumping = true;
      player.doubleJumpAvailable = true;
      playGameSound("jump");
    } else if (player.doubleJumpAvailable) {
      player.velocityY = JUMP_FORCE * 0.9;
      player.doubleJumpAvailable = false;
      playGameSound("jump");
    }
  }, [soundEnabled]);

  const slide = useCallback(() => {
    setIsSliding(true);
    setTimeout(() => setIsSliding(false), 500);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPaused(prev => !prev);
        return;
      }
      
      if (!gameStarted || isPaused || externalPaused) return;
      
      if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        jump();
      }
      
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        slide();
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (!gameStarted || isPaused || externalPaused) return;
      
      const touch = e.touches[0];
      const screenHeight = window.innerHeight;
      
      if (touch.clientY < screenHeight * 0.5) {
        jump();
      } else {
        slide();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("touchstart", handleTouchStart);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, [gameStarted, isPaused, externalPaused, jump, slide]);

  useEffect(() => {
    if (!gameStarted || isPaused || externalPaused) return;
    
    const gameLoop = () => {
      const player = playerRef.current;
      
      player.velocityY += GRAVITY;
      player.y += player.velocityY;
      
      if (player.y >= GROUND_Y - PLAYER_HEIGHT) {
        player.y = GROUND_Y - PLAYER_HEIGHT;
        player.velocityY = 0;
        player.isJumping = false;
        player.doubleJumpAvailable = true;
      }
      
      setPlayerY(player.y);
      setVelocityY(player.velocityY);
      setIsJumping(player.isJumping);
      setDoubleJumpAvailable(player.doubleJumpAvailable);
      
      const currentSpeed = activePowerUps.rocket ? gameSpeed * 1.5 : gameSpeed;
      
      setGroundOffset(prev => (prev + currentSpeed) % 100);
      setBackgroundOffset(prev => (prev + currentSpeed * 0.2) % GAME_WIDTH);
      setMidgroundOffset(prev => (prev + currentSpeed * 0.5) % GAME_WIDTH);
      
      setDistance(prev => prev + currentSpeed * 0.1);
      setScore(prev => prev + Math.round(currentSpeed * 0.5));
      
      setObstacles(prev => {
        let newObstacles = prev.map(obs => ({ ...obs, x: obs.x - currentSpeed }));
        
        newObstacles = newObstacles.filter(obs => obs.x > -100);
        
        const lastObs = newObstacles[newObstacles.length - 1];
        if (!lastObs || lastObs.x < GAME_WIDTH + 200) {
          const newX = lastObs ? lastObs.x + 250 + Math.random() * 200 : GAME_WIDTH + 200;
          newObstacles.push(generateObstacle(newX));
        }
        
        const playerBox = {
          x: 80,
          y: player.y + (isSliding ? PLAYER_HEIGHT * 0.5 : 0),
          width: PLAYER_WIDTH,
          height: isSliding ? PLAYER_HEIGHT * 0.5 : PLAYER_HEIGHT
        };
        
        newObstacles.forEach(obs => {
          if (!obs.passed && obs.x + obs.width < playerBox.x) {
            obs.passed = true;
            setScore(prev => prev + 50);
          }
          
          if (!activePowerUps.shield) {
            const collision = 
              playerBox.x < obs.x + obs.width &&
              playerBox.x + playerBox.width > obs.x &&
              playerBox.y < obs.y + obs.height &&
              playerBox.y + playerBox.height > obs.y;
            
            if (collision && !obs.passed) {
              setLives(prev => {
                const newLives = prev - 1;
                if (newLives <= 0) {
                  setTimeout(() => onGameOver(), 500);
                }
                return newLives;
              });
              playGameSound("hit");
              obs.passed = true;
            }
          }
        });
        
        return newObstacles;
      });
      
      setCoinItems(prev => {
        let newCoins = prev.map(coin => ({ ...coin, x: coin.x - currentSpeed }));
        
        newCoins = newCoins.filter(coin => coin.x > -50);
        
        const lastCoin = newCoins[newCoins.length - 1];
        if (!lastCoin || lastCoin.x < GAME_WIDTH + 50) {
          const types: ("gold" | "silver" | "diamond")[] = ["gold", "gold", "gold", "silver", "silver", "diamond"];
          for (let i = 0; i < 3; i++) {
            newCoins.push({
              x: (lastCoin?.x || GAME_WIDTH) + 100 + i * 50,
              y: GROUND_Y - 50 - Math.random() * 150,
              collected: false,
              type: types[Math.floor(Math.random() * types.length)]
            });
          }
        }
        
        newCoins.forEach(coin => {
          if (coin.collected) return;
          
          let coinX = coin.x;
          let coinY = coin.y;
          
          if (activePowerUps.magnet) {
            const dx = 80 - coin.x;
            const dy = player.y - coin.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 200) {
              coinX += dx * 0.15;
              coinY += dy * 0.15;
              coin.x = coinX;
              coin.y = coinY;
            }
          }
          
          const collision = 
            80 < coinX + 20 &&
            80 + PLAYER_WIDTH > coinX &&
            player.y < coinY + 20 &&
            player.y + PLAYER_HEIGHT > coinY;
          
          if (collision) {
            coin.collected = true;
            const values = { gold: 10, silver: 25, diamond: 100 };
            const multiplier = activePowerUps.double ? 2 : 1;
            const now = Date.now();
            
            if (now - lastCoinTime < 1000) {
              setComboMultiplier(prev => Math.min(prev + 0.1, 3));
            } else {
              setComboMultiplier(1);
            }
            setLastCoinTime(now);
            
            const coinValue = Math.round(values[coin.type] * multiplier * comboMultiplier);
            setCoins(prev => prev + coinValue);
            setScore(prev => prev + coinValue);
            playGameSound("coin");
          }
        });
        
        return newCoins;
      });
      
      setPowerUps(prev => {
        let newPowerUps = prev.map(pu => ({ ...pu, x: pu.x - currentSpeed }));
        
        newPowerUps = newPowerUps.filter(pu => pu.x > -50);
        
        const lastPU = newPowerUps[newPowerUps.length - 1];
        if (!lastPU || lastPU.x < GAME_WIDTH + 300) {
          const types: ("shield" | "magnet" | "double" | "rocket")[] = ["shield", "magnet", "double", "rocket"];
          newPowerUps.push({
            x: (lastPU?.x || GAME_WIDTH) + 500 + Math.random() * 300,
            y: GROUND_Y - 100 - Math.random() * 100,
            type: types[Math.floor(Math.random() * types.length)],
            collected: false
          });
        }
        
        newPowerUps.forEach(pu => {
          if (pu.collected) return;
          
          const collision = 
            80 < pu.x + 30 &&
            80 + PLAYER_WIDTH > pu.x &&
            player.y < pu.y + 30 &&
            player.y + PLAYER_HEIGHT > pu.y;
          
          if (collision) {
            pu.collected = true;
            playGameSound("powerup");
            
            setActivePowerUps(prev => ({ ...prev, [pu.type]: true }));
            setTimeout(() => {
              setActivePowerUps(prev => ({ ...prev, [pu.type]: false }));
            }, 8000);
          }
        });
        
        return newPowerUps;
      });
      
      setPlatforms(prev => {
        let newPlatforms = prev.map(plat => ({ ...plat, x: plat.x - currentSpeed }));
        newPlatforms = newPlatforms.filter(plat => plat.x + plat.width > -50);
        
        const lastPlat = newPlatforms[newPlatforms.length - 1];
        if (!lastPlat || lastPlat.x < GAME_WIDTH + 100) {
          newPlatforms.push({
            x: (lastPlat?.x || GAME_WIDTH) + 300 + Math.random() * 200,
            y: GROUND_Y - 100 - Math.random() * 80,
            width: 100 + Math.random() * 100
          });
        }
        
        return newPlatforms;
      });
      
      if (distance > 0 && Math.floor(distance) % 1000 === 0 && Math.floor(distance) !== 0) {
        setGameSpeed(prev => Math.min(prev + 0.5, 15));
        onComplete(score);
        playGameSound("levelup");
      }
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, [gameStarted, isPaused, externalPaused, activePowerUps, gameSpeed, isSliding, onComplete, onGameOver, soundEnabled, comboMultiplier, lastCoinTime]);

  useEffect(() => {
    if (!gameStarted || isPaused || externalPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onGameOver();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameStarted, isPaused, externalPaused, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, "#1a1a2e");
    bgGradient.addColorStop(0.5, "#16213e");
    bgGradient.addColorStop(1, "#0f0f23");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#ffffff08";
    for (let i = 0; i < 50; i++) {
      const x = (i * 37 + backgroundOffset) % GAME_WIDTH;
      const y = (i * 23) % (GAME_HEIGHT * 0.6);
      const size = 1 + (i % 3);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#1a1a3e";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 200 - midgroundOffset) % (GAME_WIDTH + 200)) - 100;
      const height = 100 + (i % 3) * 50;
      ctx.fillRect(x, GROUND_Y - height, 150, height);
    }

    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, GAME_HEIGHT);
    groundGradient.addColorStop(0, "#2d2d44");
    groundGradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);

    ctx.strokeStyle = "#3d3d5c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(GAME_WIDTH, GROUND_Y);
    ctx.stroke();

    ctx.fillStyle = "#3d3d5c";
    for (let i = 0; i < GAME_WIDTH / 50 + 1; i++) {
      const x = (i * 50 - (groundOffset % 50));
      ctx.fillRect(x, GROUND_Y + 5, 30, 5);
    }

    platforms.forEach(plat => {
      const platGradient = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + 15);
      platGradient.addColorStop(0, "#4a4a6a");
      platGradient.addColorStop(1, "#3a3a5a");
      ctx.fillStyle = platGradient;
      ctx.fillRect(plat.x, plat.y, plat.width, 15);
      ctx.strokeStyle = "#5a5a7a";
      ctx.strokeRect(plat.x, plat.y, plat.width, 15);
    });

    obstacles.forEach(obs => {
      if (obs.type === "ground") {
        const obsGradient = ctx.createLinearGradient(obs.x, obs.y, obs.x, obs.y + obs.height);
        obsGradient.addColorStop(0, "#8b4513");
        obsGradient.addColorStop(1, "#654321");
        ctx.fillStyle = obsGradient;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeStyle = "#a0522d";
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      } else if (obs.type === "air") {
        ctx.fillStyle = "#4a4a6a";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = "#ff444488";
        ctx.fillRect(obs.x + 5, obs.y + obs.height - 5, obs.width - 10, 5);
      } else if (obs.type === "spike") {
        ctx.fillStyle = "#ff4444";
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ff6666";
        ctx.stroke();
      }
    });

    coinItems.forEach(coin => {
      if (coin.collected) return;
      
      const colors = { gold: "#FFD700", silver: "#C0C0C0", diamond: "#00FFFF" };
      const sizes = { gold: 12, silver: 10, diamond: 14 };
      
      ctx.fillStyle = colors[coin.type];
      ctx.shadowColor = colors[coin.type];
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(coin.x + 10, coin.y + 10, sizes[coin.type], 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      if (coin.type === "diamond") {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    powerUps.forEach(pu => {
      if (pu.collected) return;
      
      const colors: Record<string, string> = {
        shield: "#00ff00",
        magnet: "#ff00ff",
        double: "#ffff00",
        rocket: "#ff8800"
      };
      
      ctx.fillStyle = colors[pu.type];
      ctx.shadowColor = colors[pu.type];
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(pu.x + 15, pu.y + 15, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const icons: Record<string, string> = {
        shield: "🛡️",
        magnet: "🧲",
        double: "×2",
        rocket: "🚀"
      };
      ctx.fillText(icons[pu.type], pu.x + 15, pu.y + 15);
    });

    const playerX = 80;
    const playerHeight = isSliding ? PLAYER_HEIGHT * 0.5 : PLAYER_HEIGHT;
    const playerYAdjusted = isSliding ? playerY + PLAYER_HEIGHT * 0.5 : playerY;
    
    if (activePowerUps.shield) {
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(playerX + PLAYER_WIDTH / 2, playerYAdjusted + playerHeight / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    const playerGradient = ctx.createLinearGradient(playerX, playerYAdjusted, playerX + PLAYER_WIDTH, playerYAdjusted + playerHeight);
    playerGradient.addColorStop(0, activePowerUps.rocket ? "#ff8800" : "#FFD700");
    playerGradient.addColorStop(1, activePowerUps.rocket ? "#ff4400" : "#FFA500");
    
    ctx.fillStyle = playerGradient;
    ctx.shadowColor = activePowerUps.rocket ? "#ff4400" : "#FFD700";
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.roundRect(playerX, playerYAdjusted, PLAYER_WIDTH, playerHeight, 10);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(playerX + 15, playerYAdjusted + 15, 5, 0, Math.PI * 2);
    ctx.arc(playerX + 35, playerYAdjusted + 15, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(playerX + 15, playerYAdjusted + 15, 2, 0, Math.PI * 2);
    ctx.arc(playerX + 35, playerYAdjusted + 15, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerX + 25, playerYAdjusted + 30, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    if (activePowerUps.rocket) {
      ctx.fillStyle = "#ff4400";
      ctx.shadowColor = "#ff4400";
      ctx.shadowBlur = 20;
      for (let i = 0; i < 5; i++) {
        const flameX = playerX - 10 - i * 8 - Math.random() * 5;
        const flameY = playerYAdjusted + playerHeight / 2 + (Math.random() - 0.5) * 20;
        const flameSize = 8 - i * 1.5;
        ctx.beginPath();
        ctx.arc(flameX, flameY, Math.max(flameSize, 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

  }, [playerY, obstacles, coinItems, powerUps, platforms, groundOffset, backgroundOffset, midgroundOffset, isSliding, activePowerUps]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!gameStarted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-black to-purple-900">
        <AnimatePresence>
          {countdown > 0 ? (
            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="text-9xl font-black text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]"
            >
              {countdown}
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-7xl font-black text-green-500 drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]"
            >
              RUN!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 via-black to-purple-900 relative">
      <div className="flex justify-between items-center w-full max-w-[800px] px-4 py-3 bg-black/60 backdrop-blur-sm rounded-t-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="text-xl font-black text-yellow-500">{score.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-orange-500" />
            <span className="text-lg font-black text-orange-500">{coins}</span>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Heart
                key={i}
                className={`w-5 h-5 ${i < lives ? 'text-red-500 fill-red-500' : 'text-gray-700'}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {activePowerUps.shield && <Shield className="w-6 h-6 text-green-500 animate-pulse" />}
            {activePowerUps.magnet && <Magnet className="w-6 h-6 text-pink-500 animate-pulse" />}
            {activePowerUps.double && <Zap className="w-6 h-6 text-yellow-500 animate-pulse" />}
            {activePowerUps.rocket && <Rocket className="w-6 h-6 text-orange-500 animate-pulse" />}
          </div>
          <div className={`text-xl font-black ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-white/60 text-sm font-bold">
            {Math.floor(distance)}m
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        className="border-4 border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.3)]"
      />

      <div className="flex gap-8 mt-4 text-white/60 text-sm font-bold">
        <span>SPACE/↑: Jump (Double Jump Available)</span>
        <span>↓: Slide</span>
        <span>ESC: Pause</span>
      </div>

      {comboMultiplier > 1 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-32 right-8 bg-yellow-500 text-black font-black px-4 py-2 rounded-xl"
        >
          COMBO x{comboMultiplier.toFixed(1)}
        </motion.div>
      )}

      {(isPaused || externalPaused) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
          <Pause className="w-24 h-24 text-yellow-500 mb-6" />
          <span className="text-5xl font-black text-white uppercase">Paused</span>
          <span className="text-white/60 mt-4">Press ESC to resume</span>
        </div>
      )}
    </div>
  );
}
