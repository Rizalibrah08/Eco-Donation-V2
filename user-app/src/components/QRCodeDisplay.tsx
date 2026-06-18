import React from 'react';
import QRCode from 'react-native-qrcode-svg';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export default function QRCodeDisplay({ value, size = 200, color = 'black', backgroundColor = 'white' }: QRCodeDisplayProps) {
  return (
    <QRCode
      value={value}
      size={size}
      color={color}
      backgroundColor={backgroundColor}
    />
  );
}
