import 'reflect-metadata';
import GuildService from './GuildService';

describe('GuildService', () => {
  let service: GuildService;
  let subscriptionService = {
    getSubscriptionOfGuild: jest.fn(),
  };
  let models = {
    Patron: {
      findByDiscordId: jest.fn(),
    },
    Supporter: {
      findWithGuild: jest.fn(),
    },
  };
  let config = {
    defaultMaxFeeds: 10,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    service = new GuildService(config as any, subscriptionService as any, models as any);
    subscriptionService.getSubscriptionOfGuild.mockResolvedValue(null);
    models.Patron.findByDiscordId.mockResolvedValue([]);
    models.Supporter.findWithGuild.mockResolvedValue([]);
  });

  describe('getFeedLimit', () => {
    const guildId = '123';

    it('returns the default feed limit if no subscription and no supporter', async () => {
      await expect(service.getFeedLimit(guildId)).resolves.toBe(config.defaultMaxFeeds);
    });
    describe('when subscription exists but supporter does not', () => {
      it('returns the subscription feed limit if it\'s higher than default', async () => {
        subscriptionService.getSubscriptionOfGuild.mockResolvedValue({
          extra_feeds: 100,
        });
        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          100 + config.defaultMaxFeeds,
        );
      });
      it('returns default feed limit if no subscription', async () => {
        subscriptionService.getSubscriptionOfGuild.mockResolvedValue(null);
        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          config.defaultMaxFeeds,
        );
      });
    });
    describe('when supporter exists but subscription does not', () => {
      it('returns the max feeds of all matched supporters', async () => {
        models.Supporter.findWithGuild.mockResolvedValue([{
          maxFeeds: 100,
        }, {
          maxFeeds: 200,
        }, {
          maxFeeds: 10,
        }]);

        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          200,
        );
      });
      it('returns default feed limit if no supporters found', async () => {
        models.Supporter.findWithGuild.mockResolvedValue([]);

        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          config.defaultMaxFeeds,
        );
      });
      it('returns the max feeds of all matched supporters and patrons', async () => {
        const supporters = [{
          _id: 1,
          maxFeeds: 2,
        }, {
          _id: 2,
          maxFeeds: 1,
        }, {
          _id: 3,
          patron: true,
        }];
        models.Supporter.findWithGuild.mockResolvedValue(supporters);
        models.Patron.findByDiscordId.mockImplementation((id) => id === supporters[2]._id
          ? [{
            _id: 3,
            pledge: 500,
          }]
          : [],
        );
        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          35,
        );
      });
    });
    describe('when both supporter and subscription exists', () => {
      it('returns the maximum feed limits of both', async () => {
        subscriptionService.getSubscriptionOfGuild.mockResolvedValue({
          extra_feeds: 1,
        });
        const supporters = [{
          _id: 1,
          maxFeeds: 2,
        }, {
          _id: 2,
          maxFeeds: 1,
        }, {
          _id: 3,
          patron: true,
        }];
        models.Supporter.findWithGuild.mockResolvedValue(supporters);
        models.Patron.findByDiscordId.mockImplementation((id) => id === supporters[2]._id
          ? [{
            _id: 3,
            pledge: 500,
          }]
          : [],
        );
        await expect(service.getFeedLimit(guildId)).resolves.toEqual(
          35,
        );
      });
    });
  });

  describe('getFeedLimitFromPatronPledge', () => {
    it('returns 140 for >= 2000 for pledge', function () {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      expect(service['getFeedLimitFromPatronPledge'](2100)).toEqual(140);
    });
    it('returns 70 for >= 1000 for pledge', function () {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      expect(service['getFeedLimitFromPatronPledge'](1100)).toEqual(70);
    });
    it('returns 35 for >= 500 for pledge', function () {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      expect(service['getFeedLimitFromPatronPledge'](500)).toEqual(35);
    });
    it('returns 15 for >= 250 for pledge', function () {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      expect(service['getFeedLimitFromPatronPledge'](250)).toEqual(15);
    });
    it('returns default for < 250 for pledge', function () {
      // eslint-disable-next-line @typescript-eslint/dot-notation
      expect(service['getFeedLimitFromPatronPledge'](100)).toEqual(config.defaultMaxFeeds);
    });
  });
});