'use client'

import { useState, useEffect } from 'react'
import { newsItems } from '../utils/newsData'
import SignupForm from '../components/SignupForm'
import { extractImageFromContent, extractDescriptionFromContent } from '../utils/metaUtils'

function HtmlRenderer({ content, onManifestoClick }: { content: string, onManifestoClick: () => void }) {
  // Add the global function to window object
  useEffect(() => {
    (window as any).openManifestoModal = onManifestoClick;
    return () => {
      delete (window as any).openManifestoModal;
    };
  }, [onManifestoClick]);

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

const SingleNews: React.FC<{ id: string }> = ({ id }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const newsItem = newsItems.find(item => item.link === `/news/${id}`);

    console.log(`Rendering SingleNews for ID: ${id}`, newsItem);

    const handleManifestoClick = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const shareUrl = `https://future.funyula.com/news/${id}`;
    const shareTitle = newsItem ? newsItem.title : 'News Article';
    const shareDescription = newsItem ? extractDescriptionFromContent(newsItem.content) : '';

    const handleShareClick = () => {
        setIsShareModalOpen(true);
    };

    const closeShareModal = () => {
        setIsShareModalOpen(false);
        setCopySuccess(false);
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareOnFacebook = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const shareOnTwitter = () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank');
    };

    const shareOnWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${shareTitle} ${shareUrl}`)}`, '_blank');
    };

    const shareOnLinkedIn = () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    text: shareDescription,
                    url: shareUrl,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        }
    };

    // Extract meta data for dynamic meta tags
    return (
        <>
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <a href="/news" className="text-trump-blue hover:text-trump-red font-medium">
                        ← Back to News
                    </a>
                </div>

                {/* Article header */}
                <div className="mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold  text-trump-maingreen mb-4 leading-tight">
                        {newsItem ? newsItem.title : 'Loading...'}
                    </h1>
                    {/* Share button */}
                    <div className="mb-4">
                        <button
                            onClick={handleShareClick}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-trump-blue text-white rounded-lg hover:bg-trump-red transition-colors duration-200 font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share this news
                        </button>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                        {/* <p className="text-trump-gray font-medium">{newsItem ? newsItem.date : 'Loading...'}</p> */}
                       
                    </div>
                </div>

                {/* Article body */}
                <div className="prose lg:prose-xl text-gray-800">
                    {newsItem ? (
                        <HtmlRenderer content={newsItem.content} onManifestoClick={handleManifestoClick} />
                    ) : (
                        <p>Loading...</p>
                    )}
                </div>
            </main>

            {/* Share Modal */}
            {isShareModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={closeShareModal}
                >
                    <div 
                        className="bg-white rounded-lg w-full max-w-md p-6 relative shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={closeShareModal}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold z-20 bg-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-all"
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                        
                        {/* Share options */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Share this news</h2>
                        <div className="space-y-3">
                            {/* Native share (mobile) */}
                            {navigator.share && (
                                <button
                                    onClick={nativeShare}
                                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    <span className="font-medium text-gray-800">Share via...</span>
                                </button>
                            )}
                            
                            {/* Facebook */}
                            <button
                                onClick={shareOnFacebook}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                <span className="font-medium">Share on Facebook</span>
                            </button>

                            {/* Twitter/X */}
                            <button
                                onClick={shareOnTwitter}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                </svg>
                                <span className="font-medium">Share on X (Twitter)</span>
                            </button>

                            {/* WhatsApp */}
                            <button
                                onClick={shareOnWhatsApp}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                </svg>
                                <span className="font-medium">Share on WhatsApp</span>
                            </button>

                            {/* LinkedIn */}
                            <button
                                onClick={shareOnLinkedIn}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors"
                            >
                                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                                <span className="font-medium">Share on LinkedIn</span>
                            </button>

                            {/* Copy Link */}
                            <button
                                onClick={copyToClipboard}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="font-medium text-gray-800">
                                    {copySuccess ? 'Link copied!' : 'Copy link'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={closeModal}
                >
                    <div 
                        className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto relative shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={closeModal}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold z-20 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                            aria-label="Close modal"
                        >
                            ×
                        </button>
                        
                        {/* Modal content - Remove padding to let SignupForm handle its own spacing */}
                        <div className="relative">
                            <SignupForm variant="modal" />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SingleNews;
