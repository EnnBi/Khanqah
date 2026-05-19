package sms

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	snstypes "github.com/aws/aws-sdk-go-v2/service/sns/types"
)

type Client struct {
	sns *sns.Client
}

func New(region, accessKey, secretKey string) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("sms.New: %w", err)
	}
	return &Client{sns: sns.NewFromConfig(cfg)}, nil
}

func (c *Client) SendOTP(ctx context.Context, phone, otp string) error {
	msg := fmt.Sprintf("Your Khanqah verification code is: %s. Valid for 10 minutes.", otp)
	_, err := c.sns.Publish(ctx, &sns.PublishInput{
		PhoneNumber: aws.String(phone),
		Message:     aws.String(msg),
		MessageAttributes: map[string]snstypes.MessageAttributeValue{
			"AWS.SNS.SMS.SMSType": {
				DataType:    aws.String("String"),
				StringValue: aws.String("Transactional"),
			},
		},
	})
	if err != nil {
		return fmt.Errorf("sms.SendOTP: %w", err)
	}
	return nil
}
