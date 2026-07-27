import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, RotateCcw } from 'lucide-react';

// Escape HTML helper
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Custom token-based syntax highlighting helper for JS/TS/Shell/Logs
function highlightCode(text) {
  if (!text) return '';
  
  const tokenRegex = /(\/\/.*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|\b(const|let|var|function|return|import|export|from|await|async|class|type|default)\b|\b(true|false|\d+)\b|\b(capturePage|log|success|info|error|createCloneJob|appConfig|console|casaa-rebuilder)\b|(\[.*?\])|\b(INFO|SUCCESS|WARN|ERROR|OK|Passed)\b|(https?:\/\/[^\s]+)|(\$\s+.*)|([a-zA-Z_$][a-zA-Z0-9_$]*)|(\s+)|(.)/g;
  
  let html = '';
  let match;
  
  tokenRegex.lastIndex = 0;
  
  while ((match = tokenRegex.exec(text)) !== null) {
    const [
      full,
      comment,
      string,
      keyword,
      number,
      builtin,
      timestamp,
      loglevel,
      url,
      shellcmd,
      identifier,
      whitespace,
      other
    ] = match;
    
    if (comment) {
      html += `<span class="text-neutral-500 italic">${escapeHtml(comment)}</span>`;
    } else if (string) {
      html += `<span class="text-emerald-400 font-mono">${escapeHtml(string)}</span>`;
    } else if (keyword) {
      html += `<span class="text-violet-400 font-semibold font-mono">${escapeHtml(keyword)}</span>`;
    } else if (number) {
      html += `<span class="text-amber-400 font-mono">${escapeHtml(number)}</span>`;
    } else if (builtin) {
      html += `<span class="text-blue-400 font-medium font-mono">${escapeHtml(builtin)}</span>`;
    } else if (timestamp) {
      html += `<span class="text-neutral-500 font-mono font-semibold">${escapeHtml(timestamp)}</span>`;
    } else if (loglevel) {
      let colorClass = 'text-blue-400';
      if (loglevel === 'SUCCESS' || loglevel === 'OK' || loglevel === 'Passed') {
        colorClass = 'text-emerald-400';
      } else if (loglevel === 'WARN') {
        colorClass = 'text-amber-400';
      } else if (loglevel === 'ERROR') {
        colorClass = 'text-red-400';
      }
      html += `<span class="${colorClass} font-semibold font-mono">${escapeHtml(loglevel)}</span>`;
    } else if (url) {
      html += `<span class="text-blue-400 underline font-mono">${escapeHtml(url)}</span>`;
    } else if (shellcmd) {
      const cmdText = shellcmd.slice(2);
      html += `<span class="text-violet-500 font-semibold font-mono">$</span> <span class="text-neutral-100 font-mono">${escapeHtml(cmdText)}</span>`;
    } else if (identifier) {
      html += escapeHtml(identifier);
    } else if (whitespace) {
      html += whitespace;
    } else if (other) {
      html += escapeHtml(other);
    }
  }
  
  return html;
}

export function Code({ className = '', children, code, ...props }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden border border-white/5 bg-[#0b0d16]/70 backdrop-blur-xl rounded-2xl shadow-2xl ${className}`}
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { code });
        }
        return child;
      })}
    </div>
  );
}

export function CodeHeader({ className = '', children, code, icon: Icon, copyButton = true, onRestart, ...props }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-black/40 shrink-0 gap-x-2 border-b border-white/[0.06] text-xs flex text-neutral-400 items-center px-4 w-full h-11 ${className}`}
      {...props}
    >
      {/* Window Controls */}
      <div className="flex items-center gap-1.5 mr-3">
        <span className="w-2 h-2 rounded-full bg-red-500/80" />
        <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
        <span className="w-2 h-2 rounded-full bg-green-500/80" />
      </div>
      
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
      <span className="font-mono text-[11px] text-neutral-400 select-none">{children}</span>
      
      <div className="ml-auto flex items-center gap-1.5">
        {onRestart && (
          <button
            onClick={onRestart}
            className="p-1.5 text-neutral-500 hover:text-white rounded-md hover:bg-white/5 transition-all outline-none"
            title="Replay Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {copyButton && (
          <button
            onClick={handleCopy}
            className="p-1.5 text-neutral-500 hover:text-white rounded-md hover:bg-white/5 transition-all outline-none"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function CodeBlock({
  className = '',
  code = '',
  writing = true,
  duration = 4500,
  delay = 500,
  cursor = true,
  restartTrigger = 0,
  ...props
}) {
  const [visibleCode, setVisibleCode] = useState('');
  const [isDone, setIsDone] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!writing) {
      setVisibleCode(code);
      setIsDone(true);
      return;
    }

    setVisibleCode('');
    setIsDone(false);

    if (!code) return;

    const chars = Array.from(code);
    let index = 0;
    const interval = duration / chars.length;
    let timerId = null;

    const startTimeout = setTimeout(() => {
      timerId = setInterval(() => {
        if (index < chars.length) {
          setVisibleCode(() => {
            const current = chars.slice(0, index + 1).join('');
            index += 1;
            return current;
          });
          
          if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }
        } else {
          clearInterval(timerId);
          setIsDone(true);
        }
      }, interval);
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      if (timerId) clearInterval(timerId);
    };
  }, [code, writing, duration, delay, restartTrigger]);

  const highlightedHtml = highlightCode(visibleCode);

  return (
    <div
      ref={containerRef}
      className={`relative text-xs p-4 overflow-y-auto font-mono leading-relaxed text-left flex-grow max-h-[330px] scrollbar-thin ${className}`}
      {...props}
    >
      <pre className="!bg-transparent [background:transparent_!important] border-none p-0 m-0">
        <code 
          className="block text-[12px] whitespace-pre font-mono text-neutral-300"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
        {cursor && !isDone && (
          <span className="inline-block w-[1ch] bg-blue-500 animate-pulse -translate-y-0.5 ml-0.5">|</span>
        )}
      </pre>
    </div>
  );
}
