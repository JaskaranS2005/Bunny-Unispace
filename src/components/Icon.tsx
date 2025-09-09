import React from 'react';
import * as FeatherIcons from 'react-icons/fi';

export type IconName = keyof typeof FeatherIcons;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  className?: string;
  size?: string | number;
}

const Icon: React.FC<IconProps> = ({ name, className, ...props }) => {
  const IconComponent = FeatherIcons[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} {...props} />;
};

export default Icon;

