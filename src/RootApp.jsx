import React from 'react';
import { Routes, Route } from 'react-router-dom';
import App from './App';
import { PlatformApp } from './platform/PlatformApp';

export const RootApp = () => {
  return (
    <Routes>
      <Route path="/platform/*" element={<PlatformApp />} />
      <Route path="/*" element={<App />} />
    </Routes>
  );
};

