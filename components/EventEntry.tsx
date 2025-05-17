'use client';

import { useEffect, useState } from 'react';

interface EventEntryProps {
  event: any; // Replace `any` with your actual Event type if available
  dimmed?: boolean;
}

export function EventEntry({ event, dimmed = false }: EventEntryProps) {
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date(event.timestamp).toLocaleTimeString());
  }, [event.timestamp]);

  return (
    <pre
      style={{
        fontSize: '0.85rem',
        marginBottom: '0.5rem',
        background: '#f7f7f7',
        padding: '0.5rem',
        borderRadius: '4px',
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      {time}: {JSON.stringify(event, null, 2)}
    </pre>
  );
}
