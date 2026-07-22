// premium_expires_at = NULL значит бессрочный premium (ручная выдача через grant-premium),
// иначе premium реален только пока не истёк срок (донаты дают ~месяц за раз)
function isEffectivelyPremium(user) {
  if (!user.is_premium) return false;
  if (!user.premium_expires_at) return true;
  return new Date(user.premium_expires_at) > new Date();
}

function withEffectivePremium(user) {
  return { ...user, is_premium: isEffectivelyPremium(user) };
}

module.exports = { isEffectivelyPremium, withEffectivePremium };
