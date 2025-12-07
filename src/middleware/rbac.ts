import { AuthorizationError } from '../utils/errors.js';
import type { ToolContext } from '../server/mcp-server.js';
import logger from '../utils/logger.js';

export function checkPermission(
  requiredPermission: string,
  context: ToolContext
): void {
  if (!context.userRoles || context.userRoles.length === 0) {
    logger.warn('Permission check failed: no roles', {
      requiredPermission,
    });
    throw new AuthorizationError('No roles assigned');
  }

  const userPermissions = new Set<string>();
  
  // Collect all permissions from user roles
  for (const roleName of context.userRoles) {
    const role = context.config.roles.find((r) => r.name === roleName);
    if (role) {
      for (const permission of role.permissions) {
        userPermissions.add(permission);
      }
    }
  }

  // Check exact permission or wildcard
  const hasPermission =
    userPermissions.has(requiredPermission) ||
    userPermissions.has(requiredPermission.split(':')[0] + ':*') ||
    userPermissions.has('*:*');

  if (!hasPermission) {
    logger.warn('Permission check failed', {
      requiredPermission,
      userRoles: context.userRoles,
      userPermissions: Array.from(userPermissions),
    });
    throw new AuthorizationError(
      `Missing required permission: ${requiredPermission}`
    );
  }

  logger.debug('Permission check passed', {
    requiredPermission,
    userRoles: context.userRoles,
  });
}

export function requirePermission(requiredPermission: string) {
  return (context: ToolContext): void => {
    checkPermission(requiredPermission, context);
  };
}

