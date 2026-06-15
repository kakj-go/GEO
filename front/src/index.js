import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';
import { ConfigProvider, theme } from 'antd';

import zhCN from 'antd/es/locale/zh_CN';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    <React.StrictMode>
        <ConfigProvider
            locale={zhCN}
            theme={{
                token: {
                    colorBgBase: '#ffffff',
                    colorTextBase: '#333333',
                    colorPrimary: '#2563eb',
                    borderRadius: 12,
                },
                components: {
                    Button: {
                        defaultHoverBg: '#2563eb',
                        defaultHoverColor: '#ffffff',
                        defaultHoverBorderColor: '#2563eb',
                        colorPrimaryHover: '#1d4ed8',
                    }
                }
            }}
        >
            <App />
        </ConfigProvider>
    </React.StrictMode>
);