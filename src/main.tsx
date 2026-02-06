import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary>
			<RouterProvider router={router} />
		</ErrorBoundary>
	</StrictMode>
);
