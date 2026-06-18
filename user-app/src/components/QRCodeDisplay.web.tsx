import React from 'react';
import { Image, View } from 'react-native';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

export default function QRCodeDisplay({ value, size = 200, backgroundColor = 'white', color = '000000' }: QRCodeDisplayProps) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=${backgroundColor.replace('#', '')}&color=${color.replace('#', '')}`;
  
  return (
    <View style={{ width: size, height: size, backgroundColor }}>
      <Image 
        source={{ uri: qrUrl }} 
        style={{ width: size, height: size }} 
        resizeMode="contain"
      />
    </View>
  );
}
