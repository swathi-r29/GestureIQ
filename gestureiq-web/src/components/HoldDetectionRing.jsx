import React from 'react';

/**
 * HoldDetectionRing
 * Visualizes the hold progress and state of a mudra detection.
 * Uses a premium SVG circle approach with animations.
 */
const HoldDetectionRing = ({ 
    holdProgress = 0, 
    holdState = 'idle', 
    mudraName = '', 
    accuracy = 0 
}) => {
    // Constants for the ring
    const radius = 80;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

    // Determine colors based on state
    const isEvaluating = holdState === 'evaluating';
    const isHeld = holdState === 'held' || holdProgress >= 100;
    
    let ringColor = '#6366f1'; // Default Indigo
    if (isEvaluating) ringColor = '#10b981'; // Success Green
    if (holdProgress > 0 && !isEvaluating) ringColor = '#f59e0b'; // Progress Amber

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative flex items-center justify-center w-[240px] h-[240px]">
                {/* Background Ring (Static) */}
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="absolute opacity-20"
                >
                    <circle
                        stroke="white"
                        fill="transparent"
                        strokeWidth={stroke}
                        style={{ strokeDasharray: `${circumference} ${circumference}` }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>

                {/* Progress Ring (Animated) */}
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className="absolute transform -rotate-90 transition-all duration-300 ease-out"
                >
                    <circle
                        stroke={ringColor}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ 
                            strokeDashoffset,
                            transition: 'stroke-dashoffset 0.3s ease-out, stroke 0.3s ease' 
                        }}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                </svg>

                {/* Inner Content */}
                <div className="text-center flex flex-col items-center justify-center">
                    {holdProgress > 0 && (
                        <div className="animate-in fade-in zoom-in duration-500">
                            {isEvaluating ? (
                                <div className="flex flex-col items-center">
                                    <div className="text-green-400 text-3xl font-bold mb-1">
                                        {accuracy}%
                                    </div>
                                    <div className="text-white text-[10px] tracking-[3px] uppercase font-bold px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                                        Verified
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="text-amber-400 text-[10px] tracking-[4px] uppercase font-bold mb-2">
                                        Holding...
                                    </div>
                                    <div className="text-white text-3xl font-black">
                                        {Math.round(holdProgress)}%
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {holdProgress === 0 && !isEvaluating && mudraName && (
                        <div className="text-white/40 text-[9px] tracking-[4px] uppercase font-medium max-w-[120px]">
                            Hold Still to Analyze
                        </div>
                    )}
                </div>

                {/* Outer Glow for the ring */}
                <div 
                    className="absolute rounded-full transition-all duration-700"
                    style={{
                        width: `${radius * 2}px`,
                        height: `${radius * 2}px`,
                        boxShadow: holdProgress > 0 
                            ? `0 0 40px ${ringColor}44` 
                            : 'none',
                        border: `1px solid ${ringColor}22`
                    }}
                />
            </div>
        </div>
    );
};

export default HoldDetectionRing;