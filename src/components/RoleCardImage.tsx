import React, { useState, useEffect } from 'react';
import { getRoleCardImageUrl } from '../utils/roleCardImages';
import { getLocalRoleImage } from '../utils/cardStorage';
import { ImageOff } from 'lucide-react';

interface RoleCardImageProps {
  roleId: string;
  roleName: string;
  className?: string;
}

export const RoleCardImage: React.FC<RoleCardImageProps> = ({
  roleId,
  roleName,
  className = 'w-full h-full object-cover',
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setHasError(false);
      const local = await getLocalRoleImage(roleId);
      if (local && isMounted) {
        setImgSrc(local);
        return;
      }
      const resolved = getRoleCardImageUrl(roleId);
      if (resolved && isMounted) {
        setImgSrc(resolved);
      } else if (isMounted) {
        setImgSrc(null);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [roleId]);

  if (!imgSrc || hasError) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 bg-stone-900 border border-stone-800 rounded-2xl text-center space-y-2 ${className}`}>
        <ImageOff className="w-8 h-8 text-stone-600" />
        <span className="text-xs font-bold text-stone-400">{roleName}</span>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={roleName}
      onError={() => setHasError(true)}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
};
