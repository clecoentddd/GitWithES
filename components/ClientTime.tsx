'use client';

import { useEffect, useState } from 'react';

interface EventTimeProps {
  timestamp: number;
}

export default function EventTime({ timestamp }: EventTimeProps) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    const formattedTime = new Date(timestamp).toLocaleTimeString();
    setFormatted(formattedTime);
  }, [timestamp]);

  return <>{formatted}</>;
}
